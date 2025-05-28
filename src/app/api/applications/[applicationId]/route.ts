import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { CustomFormField } from '@/types'; // For question structure

interface QuestionAnswer {
  questionId: string; // Corresponds to job_custom_questions.id
  questionLabel: string;
  questionType: CustomFormField['type'];
  answer: string | string[] | undefined; // string for most, string[] for multi-select if added
}

export interface ApiApplicationDetail {
  applicationId: number;
  jobListingId: number;
  jobTitle: string;
  applicationDate: string; // ISO string
  status: string;
  coverLetterText?: string;
  resumeSnapshotUrl?: string;
  notesForProvider?: string;
  
  seekerInfo: {
    userId: number; // Internal DB user ID
    firebaseUID: string; 
    name: string;
    email: string;
    // Add more profile fields here if needed by the view
    // e.g., headline, skills from job_seeker_profiles
  };
  
  questionsAndAnswers: QuestionAnswer[];
}

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  const applicationId = params.applicationId;
  if (!applicationId || isNaN(Number(applicationId))) {
    return NextResponse.json({ error: 'Valid Application ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. Fetch the application details
    const [appRows] = await connection.execute<RowDataPacket[]>(
      `SELECT 
         a.id, a.job_listing_id, a.seeker_user_id, a.application_date, a.status, 
         a.cover_letter_text, a.resume_snapshot_url, a.notes_for_provider, a.custom_answers,
         jl.title AS job_title,
         u.firebase_uid AS seeker_firebase_uid,
         COALESCE(jsp.full_name, u.email) AS seeker_name,
         u.email AS seeker_email
       FROM applications a
       JOIN job_listings jl ON a.job_listing_id = jl.id
       JOIN users u ON a.seeker_user_id = u.id
       LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
       WHERE a.id = ?`,
      [applicationId]
    );

    if (appRows.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    const appData = appRows[0];

    // 2. Fetch the custom questions for the job associated with this application
    const [questionSchemaRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, question_label, question_type 
       FROM job_custom_questions 
       WHERE job_listing_id = ? 
       ORDER BY display_order ASC, id ASC`,
      [appData.job_listing_id]
    );

    const questionsMap = new Map<string, { label: string; type: CustomFormField['type'] }>();
    questionSchemaRows.forEach((q: any) => {
      questionsMap.set(String(q.id), { label: q.question_label, type: q.question_type });
    });
    console.log(`[API GET /api/applications/${applicationId}] questionsMap:`, JSON.stringify(Array.from(questionsMap.entries())));


    // 3. Parse custom answers and map them to questions
    let parsedAnswers: Record<string, string> = {};
    if (appData.custom_answers) {
      console.log(`[API GET /api/applications/${applicationId}] appData.custom_answers RAW from DB - Value:`, appData.custom_answers, "- Type:", typeof appData.custom_answers); // DIAGNOSTIC LOG
      try {
        // Ensure it's a string before parsing. If it's already an object due to driver behavior, this check is important.
        if (typeof appData.custom_answers === 'string') {
          parsedAnswers = JSON.parse(appData.custom_answers);
        } else if (typeof appData.custom_answers === 'object' && appData.custom_answers !== null) {
          // If the driver somehow already parsed it (unlikely for TEXT/JSON columns returning as string by default)
          parsedAnswers = appData.custom_answers; 
          console.log(`[API GET /api/applications/${applicationId}] custom_answers was already an object.`);
        } else {
          throw new Error("custom_answers is not a string or a parsable object.");
        }
        console.log(`[API GET /api/applications/${applicationId}] parsedAnswers after potential parse:`, JSON.stringify(parsedAnswers));
      } catch (e) {
        console.error(`[API GET /api/applications/${applicationId}] Failed to parse custom_answers JSON:`, e);
        // Continue, Q&A will be empty or partial
      }
    } else {
      console.log(`[API GET /api/applications/${applicationId}] No custom_answers found in appData.`);
    }

    const questionsAndAnswers: QuestionAnswer[] = [];
    for (const questionIdStr in parsedAnswers) {
      const questionInfo = questionsMap.get(questionIdStr);
      console.log(`[API GET /api/applications/${applicationId}] Loop 1 - questionIdStr: "${questionIdStr}", questionInfo:`, JSON.stringify(questionInfo), `Answer from parsedAnswers: "${parsedAnswers[questionIdStr]}"`);
      if (questionInfo) {
        questionsAndAnswers.push({
          questionId: questionIdStr,
          questionLabel: questionInfo.label,
          questionType: questionInfo.type,
          answer: parsedAnswers[questionIdStr],
        });
      } else {
         // Handle case where an answer exists for a question no longer in schema (optional)
        questionsAndAnswers.push({
          questionId: questionIdStr,
          questionLabel: `Question ID ${questionIdStr} (schema not found)`,
          questionType: 'text', // Default or mark as unknown
          answer: parsedAnswers[questionIdStr],
        });
      }
    }
    
    // Ensure all questions from schema are present, even if not answered
    questionSchemaRows.forEach((q: any) => {
        const questionIdStr = String(q.id);
        // Check if this question (by ID) is already in questionsAndAnswers from the parsedAnswers loop
        const alreadyAdded = questionsAndAnswers.some(qa => qa.questionId === questionIdStr);
        if (!alreadyAdded) { // Only add if not already processed from parsedAnswers
            questionsAndAnswers.push({
                questionId: questionIdStr,
                questionLabel: q.question_label,
                questionType: q.question_type,
                answer: undefined, // This question was not in parsedAnswers
            });
        }
    });
    
    // Sort Q&A based on original question display_order (implicitly by schema fetch order)
    questionsAndAnswers.sort((a, b) => {
        const aSchema = questionSchemaRows.find(q => String(q.id) === a.questionId);
        const bSchema = questionSchemaRows.find(q => String(q.id) === b.questionId);
        const aOrder = questionSchemaRows.indexOf(aSchema!);
        const bOrder = questionSchemaRows.indexOf(bSchema!);
        return aOrder - bOrder;
    });


    const responsePayload: ApiApplicationDetail = {
      applicationId: appData.id,
      jobListingId: appData.job_listing_id,
      jobTitle: appData.job_title,
      applicationDate: new Date(appData.application_date).toISOString(),
      status: appData.status,
      coverLetterText: appData.cover_letter_text || undefined,
      resumeSnapshotUrl: appData.resume_snapshot_url || undefined,
      notesForProvider: appData.notes_for_provider || undefined,
      seekerInfo: {
        userId: appData.seeker_user_id,
        firebaseUID: appData.seeker_firebase_uid,
        name: appData.seeker_name,
        email: appData.seeker_email,
      },
      questionsAndAnswers: questionsAndAnswers,
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('[APPLICATION_ID_GET]', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: `Failed to retrieve application: ${errorMessage}` }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
