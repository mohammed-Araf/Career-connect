import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// Match the updated JobSeekerProfile interface from lib/api.ts
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

interface ProfileData {
  id: string; // firebase_uid
  fullName: string;
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
  email?: string; // For new user creation in 'users' table
}

interface RequestBody {
  userId: string; // This is the firebase_uid from the request body root
  profileData: ProfileData; // This is the nested profile data object
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json() as RequestBody;
    // The top-level userId is firebase_uid. profileData.id is also firebase_uid.
    // We'll use body.userId as the primary firebase_uid.
    const firebase_uid = body.userId; 
    const {
      fullName,
      headline,
      bio,
      resumeUrl,
      portfolioUrl,
      linkedinProfileUrl,
      skills,
      contactNumber,
      address,
      experience: experienceText, // Renaming to avoid conflict with a potential 'experience' variable
      yearsOfExperience,
      education,
      profileCompleted,
      email // from profileData, used for users table
    } = body.profileData;

    if (!firebase_uid || !body.profileData) {
      return NextResponse.json({ message: 'User ID and profile data are required.' }, { status: 400 });
    }

    connection = await getConnection();

    // 1. Find or create user in 'users' table
    let [userRows]: any[] = await connection.execute(
      'SELECT id FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );

    let user_id_db;
    if (userRows.length === 0) {
      const [insertResult]: any[] = await connection.execute(
        'INSERT INTO users (firebase_uid, email, role) VALUES (?, ?, ?)',
        [firebase_uid, email || `${firebase_uid}@example.com`, 'job_seeker']
      );
      user_id_db = insertResult.insertId;
      console.log(`New user created with ID: ${user_id_db} and Firebase UID: ${firebase_uid}`);
    } else {
      user_id_db = userRows[0].id;
    }

    // 2. Insert or update job_seeker_profiles with all individual columns
    const educationJson = education ? JSON.stringify(education) : null;

    // Ensure undefined optional fields are converted to null for SQL
    const sqlParams = [
      user_id_db,
      fullName || null, // Assuming fullName can be null based on schema `VARCHAR(255) NULL`
      headline || null,
      bio || null,
      resumeUrl || null,
      portfolioUrl || null,
      linkedinProfileUrl || null,
      skills || null,
      contactNumber || null,
      address || null,
      experienceText || null,
      yearsOfExperience || null,
      educationJson, // Already handles null if education is undefined
      profileCompleted // This is boolean, should be fine (0 or 1 in DB)
    ];

    const sql = `
      INSERT INTO job_seeker_profiles (
        user_id, full_name, headline, bio, resume_url, portfolio_url, linkedin_profile_url,
        skills, contact_number, address, experience, years_of_experience, education, profile_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        headline = VALUES(headline),
        bio = VALUES(bio),
        resume_url = VALUES(resume_url),
        portfolio_url = VALUES(portfolio_url),
        linkedin_profile_url = VALUES(linkedin_profile_url),
        skills = VALUES(skills),
        contact_number = VALUES(contact_number),
        address = VALUES(address),
        experience = VALUES(experience),
        years_of_experience = VALUES(years_of_experience),
        education = VALUES(education),
        profile_completed = VALUES(profile_completed)
    `;
    
    await connection.execute(sql, sqlParams);

    return NextResponse.json({ message: 'Profile saved successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving profile:', error);
    // Ensure the error structure is what the frontend expects, or adjust frontend error handling
    return NextResponse.json({ message: 'Error saving profile', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
