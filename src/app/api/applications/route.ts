import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type mysql from 'mysql2'; // Import mysql types

// Define the structure for an applicant as returned by the API
export interface ApiApplicant {
  applicationId: number;
  jobListingId: number;
  jobTitle: string; // From job_listings
  seekerUserId: number; // This is the internal DB ID of the seeker
  seekerName: string; // From job_seeker_profiles or users
  seekerEmail: string; // From users
  applicationDate: string; // ISO string
  status: string; // ENUM from applications table
}

export async function GET(request: Request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const providerFirebaseUID = searchParams.get('providerId'); // This is Firebase UID
    const jobId = searchParams.get('jobId'); 

    if (!providerFirebaseUID && !jobId) {
      return NextResponse.json({ message: 'providerId (Firebase UID) or jobId is required' }, { status: 400 });
    }

    connection = await getConnection();
    let query = `
      SELECT
        a.id AS applicationId,
        a.job_listing_id AS jobListingId,
        jl.title AS jobTitle,
        a.seeker_user_id AS seekerUserId,
        COALESCE(jsp.full_name, u.email) AS seekerName, 
        u.email AS seekerEmail,
        a.application_date AS applicationDate,
        a.status
      FROM applications a
      JOIN job_listings jl ON a.job_listing_id = jl.id
      JOIN users u ON a.seeker_user_id = u.id
      LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
    `;

    const queryParams: (string | number)[] = [];
    const conditions: string[] = [];

    if (providerFirebaseUID) {
      // Get the internal user ID for the given providerFirebaseUID
      const [providerUserRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE firebase_uid = ? AND role = \'job-provider\'',
        [providerFirebaseUID]
      );

      if (providerUserRows.length === 0) {
        console.log(`[API GET /api/applications] No job provider found for Firebase UID: ${providerFirebaseUID}`);
        return NextResponse.json({ applicants: [] }); // No provider, so no applicants for their jobs
      }
      const internalProviderUserId = providerUserRows[0].id;
      conditions.push("jl.provider_user_id = ?");
      queryParams.push(internalProviderUserId);

    } else if (jobId) {
      conditions.push("a.job_listing_id = ?");
      queryParams.push(jobId);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.application_date DESC;";

    const [rows] = await connection.execute<RowDataPacket[]>(query, queryParams);

    const applicants: ApiApplicant[] = rows.map((row: any) => ({
      applicationId: row.applicationId,
      jobListingId: row.jobListingId,
      jobTitle: row.jobTitle,
      seekerUserId: row.seekerUserId,
      seekerName: row.seekerName,
      seekerEmail: row.seekerEmail,
      applicationDate: new Date(row.applicationDate).toISOString(),
      status: row.status,
    }));

    return NextResponse.json({ applicants });

  } catch (error) {
    console.error('API Error fetching applicants:', error);
    return NextResponse.json({ message: 'Failed to fetch applicants', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

interface SubmitApplicationPayload {
  jobListingId: number;
  seekerFirebaseUID: string;
  coverLetterText?: string;
  resumeSnapshotUrl?: string;
  notesForProvider?: string;
  customAnswers?: Record<string, string>;
}

export async function POST(request: Request) {
  let connection;
  try {
    const body = await request.json() as SubmitApplicationPayload;
    const { 
      jobListingId, 
      seekerFirebaseUID, 
      coverLetterText, 
      resumeSnapshotUrl, 
      notesForProvider,
      customAnswers 
    } = body;

    // console.log(`[API POST /api/applications] Received seekerFirebaseUID: "${seekerFirebaseUID}", jobListingId: ${jobListingId}`);

    if (!jobListingId || !seekerFirebaseUID) {
      // console.log(`[API POST /api/applications] Error: Missing jobListingId or seekerFirebaseUID.`);
      return NextResponse.json({ message: 'Job ID and Seeker Firebase UID are required.' }, { status: 400 });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    const userLookupQuery = 'SELECT id, role FROM users WHERE firebase_uid = ?';
    const userLookupParams = [seekerFirebaseUID];
    // console.log(`[API POST /api/applications] Executing user lookup. Query: "${userLookupQuery}", Params: ${JSON.stringify(userLookupParams)}`);

    const [userRows] = await connection.execute<RowDataPacket[]>(
      userLookupQuery,
      userLookupParams
    );

    // console.log(`[API POST /api/applications] User lookup for Firebase UID "${seekerFirebaseUID}" found ${userRows.length} rows.`);

    if (userRows.length === 0) {
      await connection.rollback();
      // console.log(`[API POST /api/applications] Error: User not found by Firebase UID. Returning 404.`);
      return NextResponse.json({ message: 'Job seeker not found for the given Firebase UID.' }, { status: 404 });
    }
    
    const dbUser = userRows[0];
    // console.log(`[API POST /api/applications] User found in DB. ID: ${dbUser.id}, Role from DB: "${dbUser.role}"`);

    if (dbUser.role !== 'job-seeker') {
      await connection.rollback();
      // console.log(`[API POST /api/applications] Error: User role is "${dbUser.role}", not "job-seeker". Returning 404.`);
      return NextResponse.json({ message: 'User found, but role is not job_seeker.' }, { status: 403 });
    }

    const actualSeekerUserId = dbUser.id as number;
    // console.log(`[API POST /api/applications] User confirmed as job_seeker. Internal user ID: ${actualSeekerUserId}`);

    const [existingApplications] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM applications WHERE job_listing_id = ? AND seeker_user_id = ?',
      [jobListingId, actualSeekerUserId]
    );

    if (existingApplications.length > 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'You have already applied for this job.' }, { status: 409 });
    }

    const sql = `
      INSERT INTO applications (
        job_listing_id, 
        seeker_user_id, 
        cover_letter_text, 
        resume_snapshot_url, 
        notes_for_provider,
        custom_answers,
        application_date,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Submitted');
    `;
    
    const valuesToInsert = [
      jobListingId,
      actualSeekerUserId,
      coverLetterText === undefined ? null : coverLetterText,
      resumeSnapshotUrl === undefined ? null : resumeSnapshotUrl,
      notesForProvider === undefined ? null : notesForProvider,
      customAnswers ? JSON.stringify(customAnswers) : null,
    ];

    const [result] = await connection.execute<mysql.ResultSetHeader>(sql, valuesToInsert);
    const newApplicationId = result.insertId;

    if (newApplicationId) {
      await connection.commit();
      return NextResponse.json({ message: 'Application submitted successfully', applicationId: newApplicationId }, { status: 201 });
    } else {
      await connection.rollback();
      return NextResponse.json({ message: 'Failed to submit application' }, { status: 500 });
    }

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error submitting application:', error);
    const errorMessage = error.message || 'An unknown error occurred.';
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ message: 'Error submitting application: Invalid job listing or user.', error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ message: `Error submitting application: ${errorMessage}`, error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
