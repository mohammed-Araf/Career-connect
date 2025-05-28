import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type mysql from 'mysql2';
import type { CustomFormField } from '@/types'; // Import CustomFormField

// Define a more specific type for the raw database result
interface JobListingRow extends RowDataPacket {
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
  expires_at: Date | null;
  application_deadline: Date | null;
  how_to_apply: string | null;
  provider_company_name: string | null; // From job_provider_profiles
  provider_company_logo_url: string | null; // From job_provider_profiles
}

// Define the structure of the transformed Job object for the API response
// This should align with src/types/index.ts Job type eventually
export interface ApiJob {
  id: string; // Or number, decide based on frontend needs
  title: string;
  company: string;
  location: string | null;
  shortDescription: string;
  description: string;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary' | 'Freelance' | null;
  experienceLevel: 'Entry-level' | 'Mid-level' | 'Senior-level' | 'Lead' | 'Manager' | 'Executive' | null;
  postedDate: string; // ISO string
  salary: string | null;
  skills: string[];
  companyLogoUrl: string | null;
  applyUrl: string | null; // Extracted from how_to_apply or direct link
  // Consider adding expires_at, application_deadline if needed by frontend
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null
): string | null {
  if (min === null && max === null) return null;
  currency = currency || 'INR'; // Default currency
  period = period ? ` per ${period}` : '';

  if (min !== null && max !== null) {
    if (min === max) return `${currency} ${min.toLocaleString()}${period}`;
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}${period}`;
  }
  if (min !== null) return `${currency} ${min.toLocaleString()}${period}`;
  if (max !== null) return `${currency} ${max.toLocaleString()}${period}`;
  return null;
}

// Basic extraction of a URL from 'how_to_apply' text.
// This can be made more robust.
function extractApplyUrl(howToApply: string | null): string | null {
  if (!howToApply) return null;
  const urlMatch = howToApply.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}


export async function GET(request: Request) {
  let connection;
  try {
    const url = new URL(request.url);
    const providerFirebaseUID = url.searchParams.get('providerFirebaseUID');
    const searchTerm = url.searchParams.get('searchTerm');
    const location = url.searchParams.get('location');
    const experience = url.searchParams.get('experience'); // e.g., 'entry-level', 'mid-level'

    connection = await getConnection();
    let providerUserIdToFilter: number | null = null;

    if (providerFirebaseUID) {
      // Find the user's internal ID from firebaseUID
      const [userRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE firebase_uid = ?',
        [providerFirebaseUID]
      );
      if (userRows.length > 0) {
        providerUserIdToFilter = userRows[0].id;
      } else {
        // If firebaseUID is provided but no user found, return empty list as no jobs can match
        return NextResponse.json({ jobs: [] });
      }
    }

    let selectClause = `
      SELECT
        jl.id,
        jl.title,
        jl.short_description,
        jl.description,
        jl.company_name_override,
        jl.location,
        jl.salary_min,
        jl.salary_max,
        jl.salary_currency,
        jl.salary_period,
        jl.job_type,
        jl.experience_level,
        jl.required_skills,
        jl.posted_at,
        jl.expires_at,
        jl.application_deadline,
        jl.how_to_apply,
        jpp.company_name AS provider_company_name,
        jpp.company_logo_url AS provider_company_logo_url
    `;
    const fromClause = `
      FROM job_listings jl
      LEFT JOIN users u ON jl.provider_user_id = u.id
      LEFT JOIN job_provider_profiles jpp ON u.id = jpp.user_id
    `;
    
    const queryParams: (string | number)[] = [];
    const conditions: string[] = [];
    let orderByClause = " ORDER BY jl.posted_at DESC"; // Default order

    // Always filter by active
    conditions.push("jl.is_active = TRUE");

    if (providerUserIdToFilter !== null) {
      conditions.push("jl.provider_user_id = ?");
      queryParams.push(providerUserIdToFilter);
    }

    if (searchTerm) {
      const matchAgainst = `MATCH(jl.title, jl.short_description, jl.description, jl.company_name_override, jl.required_skills) AGAINST (? IN NATURAL LANGUAGE MODE)`;
      selectClause += `, ${matchAgainst} AS score`;
      conditions.push(matchAgainst);
      queryParams.push(searchTerm); // For the SELECT's MATCH
      queryParams.push(searchTerm); // For the WHERE's MATCH
      orderByClause = " ORDER BY score DESC, jl.posted_at DESC";
    }

    if (location) {
      conditions.push("jl.location LIKE ?");
      queryParams.push(`%${location}%`);
    }

    if (experience) {
      conditions.push("jl.experience_level = ?");
      queryParams.push(experience);
    }

    let whereClause = "";
    if (conditions.length > 0) {
      whereClause = " WHERE " + conditions.join(" AND ");
    }
    
    const finalQuery = selectClause + fromClause + whereClause + orderByClause + ";";

    const [rows] = await connection.execute<JobListingRow[]>(finalQuery, queryParams);

    const jobs: ApiJob[] = rows.map(row => {
      const companyName = row.company_name_override || row.provider_company_name || 'N/A';
      const companyLogo = row.provider_company_logo_url || null; // Use provider's logo if no override

      return {
        id: String(row.id),
        title: row.title,
        company: companyName,
        location: row.location,
        shortDescription: row.short_description || (row.description ? row.description.substring(0, 150) + (row.description.length > 150 ? '...' : '') : ''),
        description: row.description,
        jobType: row.job_type,
        experienceLevel: row.experience_level,
        postedDate: row.posted_at.toISOString(),
        salary: formatSalary(row.salary_min, row.salary_max, row.salary_currency, row.salary_period),
        skills: row.required_skills ? row.required_skills.split(',').map(skill => skill.trim()) : [],
        companyLogoUrl: companyLogo,
        applyUrl: extractApplyUrl(row.how_to_apply) || row.how_to_apply, // Fallback to full text if no URL
      };
    });

    return NextResponse.json({ jobs });

  } catch (error) {
    console.error('API Error fetching jobs:', error);
    return NextResponse.json({ message: 'Failed to fetch jobs', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Assuming PostJobFormValues from the client, which needs to be aligned with Job type and DB schema.
// For a real app, proper validation (e.g., with Zod on the server) is crucial.
export interface CreateJobPayload { // Added export
  title: string;
  companyNameOverride: string; // Maps to company in form
  location: string;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary' | 'Freelance' | null;
  description: string;
  shortDescription?: string; // Added for edit/create
  requiredSkills?: string; // Comma-separated string from form's skills field
  howToApply?: string; // From form's applyUrl
  // These would ideally be parsed on the server or sent structured from client
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annually';
  experienceLevel?: 'Entry-level' | 'Mid-level' | 'Senior-level' | 'Lead' | 'Manager' | 'Executive';
  firebaseUID: string; // Changed from providerUserId to firebaseUID
  customQuestions?: CustomFormField[]; // Use imported CustomFormField type
}


export async function POST(request: Request) {
  let connection;
  try {
    const body = await request.json() as CreateJobPayload;

    // Basic validation (more robust validation with Zod is recommended)
    if (!body.title || !body.description || !body.firebaseUID) {
      return NextResponse.json({ message: 'Missing required fields (title, description, firebaseUID)' }, { status: 400 });
    }

    connection = await getConnection();

    // 1. Find the user's internal ID from firebaseUID
    const [userRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE firebase_uid = ?',
      [body.firebaseUID]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'Provider user not found for the given firebaseUID' }, { status: 404 });
    }
    const providerUserId = userRows[0].id;

    // 2. Insert the job listing
    const insertQuery = `
      INSERT INTO job_listings (
        provider_user_id, 
        title,
        short_description, 
        description, 
        company_name_override, 
        location, 
        job_type, 
        experience_level, 
        required_skills, 
        how_to_apply,
        salary_min,
        salary_max,
        salary_currency,
        salary_period,
        posted_at, 
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), TRUE);
    `; // Added short_description, total 14 + NOW() + TRUE

    // Ensure values match the order in the query, converting undefined to null
    const values = [
      providerUserId, // Use the fetched internal ID
      body.title,
      body.shortDescription === undefined ? null : body.shortDescription, // Added shortDescription
      body.description,
      body.companyNameOverride, // Assumed to be present due to client-side Zod validation for 'company'
      body.location,          // Assumed to be present due to client-side Zod validation for 'location'
      body.jobType,           // Assumed to be present due to client-side Zod validation for 'jobType'
      body.experienceLevel === undefined ? null : body.experienceLevel,
      body.requiredSkills === undefined ? null : body.requiredSkills,
      body.howToApply === undefined ? null : body.howToApply,
      body.salaryMin === undefined ? null : body.salaryMin,
      body.salaryMax === undefined ? null : body.salaryMax,
      body.salaryCurrency === undefined ? null : body.salaryCurrency,
      body.salaryPeriod === undefined ? null : body.salaryPeriod
    ];

    await connection.beginTransaction(); // Start transaction

    const [result] = await connection.execute<mysql.ResultSetHeader>(insertQuery, values);
    const newJobId = result.insertId;

    if (newJobId) {
      if (body.customQuestions && body.customQuestions.length > 0) {
        const questionQuery = `
          INSERT INTO job_custom_questions (
            job_listing_id, question_label, question_type, options_list, is_required, display_order
          ) VALUES (?, ?, ?, ?, ?, ?);
        `;
        for (let i = 0; i < body.customQuestions.length; i++) {
          const q = body.customQuestions[i];
          await connection.execute(questionQuery, [
            newJobId,
            q.label,
            q.type,
            q.options === undefined ? null : q.options,
            q.isRequired,
            i // Using loop index as display_order
          ]);
        }
      }
      await connection.commit(); // Commit transaction
      return NextResponse.json({ message: 'Job posted successfully', jobId: newJobId }, { status: 201 });
    } else {
      await connection.rollback(); // Rollback transaction
      return NextResponse.json({ message: 'Failed to post job' }, { status: 500 });
    }

  } catch (error) {
    if (connection) await connection.rollback(); // Rollback on error
    console.error('API Error posting job:', error);
    return NextResponse.json({ message: 'Failed to post job', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
