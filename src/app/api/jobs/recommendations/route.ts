import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { ApiJob } from '@/app/api/jobs/route'; // Assuming ApiJob is exported from there

// Types from job_portal.sql (simplified)
interface JobSeekerProfileRow extends RowDataPacket {
  user_id: number;
  skills: string | null; // Comma-separated
  experience: string | null; // Text field
  years_of_experience: string | null; // e.g., "5-7 years" or "5"
  // Add other relevant fields like headline, bio if used in matching
}

interface JobListingRowForReco extends RowDataPacket {
  id: number;
  title: string;
  description: string;
  company_name_override: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annually' | null;
  job_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary' | 'Freelance' | null;
  experience_level: 'Entry-level' | 'Mid-level' | 'Senior-level' | 'Lead' | 'Manager' | 'Executive' | null;
  required_skills: string | null; // Comma-separated
  posted_at: Date;
  provider_company_name: string | null;
  provider_company_logo_url: string | null;
  how_to_apply: string | null;
}

// Helper to format salary (can be shared or imported if identical to jobs/route.ts)
function formatSalary(min: number | null, max: number | null, currency: string | null, period: string | null): string | null {
  if (min === null && max === null) return null;
  currency = currency || 'INR';
  period = period ? ` per ${period}` : '';
  if (min !== null && max !== null) return min === max ? `${currency} ${min.toLocaleString()}${period}` : `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}${period}`;
  if (min !== null) return `${currency} ${min.toLocaleString()}${period}`;
  if (max !== null) return `${currency} ${max.toLocaleString()}${period}`;
  return null;
}

function extractApplyUrl(howToApply: string | null): string | null {
  if (!howToApply) return null;
  const urlMatch = howToApply.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

// Simplified experience level mapping for scoring
const experienceLevelMap: Record<string, number> = {
  'Entry-level': 1,
  'Mid-level': 2,
  'Senior-level': 3,
  'Lead': 4,
  'Manager': 5,
  'Executive': 6,
};

// Helper to parse years_of_experience (very basic)
function parseYearsExperience(yearsStr: string | null): number {
    if (!yearsStr) return 0;
    const match = yearsStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const firebaseUID = searchParams.get('userId'); // Treat userId query param as firebaseUID

  if (!firebaseUID) {
    return NextResponse.json({ message: 'Firebase User ID (userId) is required' }, { status: 400 });
  }

  let connection;
  try {
    // Handle synthetic users: if firebaseUID indicates a fake user, return empty recommendations
    if (firebaseUID.startsWith('fake_firebase_uid_')) {
      console.log(`Synthetic user detected (Firebase UID: ${firebaseUID}). Returning empty recommendations.`);
      return NextResponse.json({ jobs: [] });
    }

    connection = await getConnection();

    // 1. Get internal SQL user ID from Firebase UID
    const [userRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE firebase_uid = ?',
      [firebaseUID]
    );

    if (userRows.length === 0) {
      // This case should ideally not be hit for non-fake UIDs if authentication is proper.
      // If it is hit, it means a real Firebase UID has no corresponding entry in our 'users' table.
      return NextResponse.json({ message: 'User not found in database for the given Firebase UID' }, { status: 404 });
    }
    const internalUserId = userRows[0].id;

    // 2. Fetch Job Seeker's Profile using the internal SQL user ID
    const [profileRows] = await connection.execute<JobSeekerProfileRow[]>(
      'SELECT skills, experience, years_of_experience FROM job_seeker_profiles WHERE user_id = ?',
      [internalUserId]
    );

    if (profileRows.length === 0) {
      // This means the user exists in 'users' table but not in 'job_seeker_profiles'.
      // This could happen if the profile setup is incomplete.
      // Return empty recommendations or a specific message.
      console.warn(`Job seeker profile not found for internal user ID: ${internalUserId} (Firebase UID: ${firebaseUID})`);
      return NextResponse.json({ jobs: [] }); // Return empty array, frontend handles "no recommendations"
    }
    const seekerProfile = profileRows[0];
    const seekerSkills = seekerProfile.skills ? seekerProfile.skills.toLowerCase().split(',').map(s => s.trim()) : [];
    const seekerYearsExp = parseYearsExperience(seekerProfile.years_of_experience);


    // 2. Fetch All Active Job Listings
    const jobsQuery = `
      SELECT
        jl.id, jl.title, jl.description, jl.company_name_override, jl.location,
        jl.salary_min, jl.salary_max, jl.salary_currency, jl.salary_period,
        jl.job_type, jl.experience_level, jl.required_skills, jl.posted_at,
        jl.how_to_apply,
        jpp.company_name AS provider_company_name,
        jpp.company_logo_url AS provider_company_logo_url
      FROM job_listings jl
      LEFT JOIN users u ON jl.provider_user_id = u.id
      LEFT JOIN job_provider_profiles jpp ON u.id = jpp.user_id
      WHERE jl.is_active = TRUE;
    `;
    const [jobListingRows] = await connection.execute<JobListingRowForReco[]>(jobsQuery);

    // 3. Apply Recommendation Algorithm
    const recommendedJobs = jobListingRows.map(job => {
      let score = 0;
      const jobSkills = job.required_skills ? job.required_skills.toLowerCase().split(',').map(s => s.trim()) : [];

      // Skill matching score
      const matchedSkills = jobSkills.filter(skill => seekerSkills.includes(skill));
      score += matchedSkills.length * 10; // 10 points per matched skill

      // Experience level matching score (basic)
      const jobExpLevelNum = job.experience_level ? experienceLevelMap[job.experience_level] || 0 : 0;
      
      // Simple logic: if job requires more exp, penalize slightly or ignore.
      // If job requires less or equal, give points.
      // This needs refinement based on how years_of_experience is structured and used.
      if (jobExpLevelNum > 0 && seekerYearsExp > 0) {
        if (seekerYearsExp >= jobExpLevelNum) { // User has enough or more experience
            score += 5;
        } else if (seekerYearsExp === jobExpLevelNum -1 ){ // User is one level below
            score += 2; // Still some points if close
        }
      }


      // Add more scoring criteria here (e.g., location, keywords in title/description)

      const companyName = job.company_name_override || job.provider_company_name || 'N/A';
      const companyLogo = job.provider_company_logo_url || null;

      const apiJob: ApiJob = {
        id: String(job.id),
        title: job.title,
        company: companyName,
        location: job.location,
        shortDescription: job.description ? job.description.substring(0, 150) + (job.description.length > 150 ? '...' : '') : '',
        description: job.description,
        jobType: job.job_type,
        experienceLevel: job.experience_level,
        postedDate: job.posted_at.toISOString(),
        salary: formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period),
        skills: job.required_skills ? job.required_skills.split(',').map(skill => skill.trim()) : [],
        companyLogoUrl: companyLogo,
        applyUrl: extractApplyUrl(job.how_to_apply) || job.how_to_apply,
      };
      return { ...apiJob, score };
    })
    .filter(job => job.score > 0) // Only include jobs with a positive score
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 10); // Return top 10 recommendations

    return NextResponse.json({ jobs: recommendedJobs });

  } catch (error) {
    console.error('API Error fetching recommendations:', error);
    return NextResponse.json({ message: 'Failed to fetch recommendations', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
