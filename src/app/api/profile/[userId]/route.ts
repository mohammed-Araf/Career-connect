import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// This interface should align with JobSeekerProfile in lib/api.ts for the data returned
interface EducationEntry {
  level: string;
  institutionName: string;
  institutionAddress: string;
  course?: string;
  joinYear: string;
  passOutYear?: string;
  isDiploma?: boolean;
  isStudying?: boolean;
}

// Interface representing the raw row from the database (snake_case)
interface DbProfileRow {
  user_id: number;
  full_name?: string; 
  headline?: string;
  bio?: string;
  resume_url?: string;
  portfolio_url?: string;
  linkedin_profile_url?: string;
  skills?: string;
  contact_number?: string;
  address?: string;
  experience?: string;
  years_of_experience?: string;
  education?: string; // JSON string from DB
  profile_completed: boolean | number; 
}

// Interface for the client (camelCase, matching JobSeekerProfile in lib/api.ts)
interface JobSeekerProfileForClient {
  id: string; // firebase_uid
  fullName?: string; // Optional because full_name from DB might be null
  headline?: string;
  bio?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinProfileUrl?: string;
  skills?: string;
  contactNumber?: string;
  address?: string;
  experience?: string;
  yearsOfExperience?: string;
  education?: EducationEntry[];
  profileCompleted: boolean;
}


export async function GET(request: NextRequest, { params: paramsPromise }: { params: { userId: string } }) { // Renamed for clarity
  let connection;
  try {
    const params = await paramsPromise; // Await the params object
    const firebase_uid = params.userId;

    if (!firebase_uid) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    connection = await getConnection();

    const [userRows]: any[] = await connection.execute(
      'SELECT id FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    const user_id_db = userRows[0].id;

    // Use correct snake_case column names from the database
    const sqlSelect = `
      SELECT 
        full_name, headline, bio, resume_url, portfolio_url, linkedin_profile_url,
        skills, contact_number, address, experience, years_of_experience, education, profile_completed
      FROM job_seeker_profiles WHERE user_id = ?
    `;
    const [profileRows]: any[] = await connection.execute(sqlSelect, [user_id_db]);

    if (profileRows.length > 0) {
      const dbRow = profileRows[0] as DbProfileRow;
      
      let parsedEducation: EducationEntry[] | undefined = undefined;
      if (dbRow.education) {
        try {
          parsedEducation = JSON.parse(dbRow.education);
        } catch (e) {
          console.error("Failed to parse education JSON string from DB:", e);
          parsedEducation = undefined; 
        }
      }

      // Map snake_case from DB to camelCase for client
      const clientProfile: JobSeekerProfileForClient = {
        id: firebase_uid,
        fullName: dbRow.full_name,
        headline: dbRow.headline,
        bio: dbRow.bio,
        resumeUrl: dbRow.resume_url,
        portfolioUrl: dbRow.portfolio_url,
        linkedinProfileUrl: dbRow.linkedin_profile_url,
        skills: dbRow.skills,
        contactNumber: dbRow.contact_number,
        address: dbRow.address,
        experience: dbRow.experience,
        yearsOfExperience: dbRow.years_of_experience,
        education: parsedEducation,
        profileCompleted: Boolean(dbRow.profile_completed),
      };
      
      return NextResponse.json(clientProfile, { status: 200 });
    } else {
      return NextResponse.json(null, { status: 404 });
    }

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ message: 'Error fetching profile', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
