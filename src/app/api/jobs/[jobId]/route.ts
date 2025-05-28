import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import type { Job, CustomFormField } from "@/types"; // Added CustomFormField
import type { RowDataPacket } from "mysql2";
import type mysql from "mysql2"; // Import mysql types

// Helper function to format salary
function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null
): string | undefined {
  if (min === null && max === null) return undefined;

  let salaryStr = "";
  if (min !== null) salaryStr += `${currency || ""}${min}`;
  if (max !== null) {
    if (min !== null) salaryStr += " - ";
    salaryStr += `${currency || ""}${max}`;
  }
  if (period) salaryStr += ` per ${period}`;
  return salaryStr.trim() || undefined;
}

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  // console.log(
  //   `[API /api/jobs/${jobId} GET] Handler invoked for jobId: ${jobId}`
  // ); // LOG A

  if (!jobId) {
    // console.log(
    //   `[API /api/jobs/${jobId} GET] Error: Job ID is missing in params.`
    // );
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();
    // Adjusted query to select from job_listings and join to get company details
    // For simplicity, using company_name_override directly. A more complex query would join with job_provider_profiles.
    const query = `
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
        jl.how_to_apply,
        jpp.company_name AS provider_company_name,
        jpp.company_logo_url
      FROM job_listings jl
      LEFT JOIN users u ON jl.provider_user_id = u.id
      LEFT JOIN job_provider_profiles jpp ON u.id = jpp.user_id
      WHERE jl.id = ? AND jl.is_active = TRUE;
    `;
    const [jobRows] = await connection.execute<RowDataPacket[]>(query, [jobId]);

    if (jobRows.length === 0) {
      return NextResponse.json(
        { error: "Job not found or not active" },
        { status: 404 }
      );
    }

    const dbJob = jobRows[0];

    // Fetch custom questions for this job
    const [questionRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id, question_label, question_type, options_list, is_required FROM job_custom_questions WHERE job_listing_id = ? ORDER BY display_order ASC, id ASC",
      [dbJob.id]
    );

    // DIAGNOSTIC LOG: Check raw questionRows from DB
    // console.log(
    //   `[API /api/jobs/${jobId} GET] Fetched main job data for ID ${dbJob.id}. Querying custom questions...`
    // );
    // console.log(
    //   `[API /api/jobs/${jobId} GET] Raw questionRows for job ID ${dbJob.id}:`,
    //   JSON.stringify(questionRows)
    // );

    const customQuestions: CustomFormField[] = questionRows.map(
      (qRow: any) => ({
        id: String(qRow.id), // Form expects string IDs for useFieldArray
        label: qRow.question_label,
        type: qRow.question_type as CustomFormField["type"],
        options: qRow.options_list || undefined,
        isRequired: Boolean(qRow.is_required),
      })
    );

    // Map database row to Job type
    const responseJob: Job = {
      id: String(dbJob.id),
      title: dbJob.title,
      company:
        dbJob.company_name_override || dbJob.provider_company_name || "N/A",
      location: dbJob.location,
      shortDescription:
        dbJob.short_description ||
        (dbJob.description ? dbJob.description.substring(0, 200) : ""),
      description: dbJob.description,
      type: dbJob.job_type as Job["type"],
      experienceLevel: dbJob.experience_level as Job["experienceLevel"],
      postedDate: new Date(dbJob.posted_at).toISOString(),
      salary: formatSalary(
        dbJob.salary_min,
        dbJob.salary_max,
        dbJob.salary_currency,
        dbJob.salary_period
      ),
      skills: dbJob.required_skills
        ? dbJob.required_skills.split(",").map((skill: string) => skill.trim())
        : [],
      companyLogoUrl: dbJob.company_logo_url,
      applyUrl: dbJob.how_to_apply,
      customQuestions: customQuestions, // Add fetched custom questions
    };

    return NextResponse.json(responseJob);
  } catch (error) {
    console.error("[JOB_ID_GET]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: `Failed to retrieve job: ${errorMessage}` },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Placeholder for getting current authenticated user's ID (e.g., from session/token)
// In a real app, this would involve proper auth checking.
async function getAuthenticatedUserIdFromRequest(
  request: Request
): Promise<number | null> {
  // This is a placeholder. In a real app, you'd get this from a verified session or token.
  // For now, let's assume it might be passed via a header for demo purposes,
  // or you'd use a library like NextAuth.js to get session data.
  // const session = await getServerSession(authOptions); return session?.user?.id (MySQL id)
  // For this example, returning null, meaning ownership won't be checked without actual auth.
  // If you have a way to get firebaseUID from request, you can look up the MySQL id.
  const firebaseUID = request.headers.get("X-User-Firebase-UID"); // Example header
  if (firebaseUID) {
    let conn;
    try {
      conn = await getConnection();
      const [userRows] = await conn.execute<RowDataPacket[]>(
        "SELECT id FROM users WHERE firebase_uid = ?",
        [firebaseUID]
      );
      if (userRows.length > 0) {
        return userRows[0].id as number;
      }
    } catch (e) {
      console.error("Error fetching user by firebaseUID for auth check", e);
    } finally {
      if (conn) await conn.end();
    }
  }
  return null; 
}

export async function DELETE(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  // In a real app, proper authentication and authorization are crucial here.
  // Only the job owner or an admin should be able to delete a job.
  const authenticatedUserId = await getAuthenticatedUserIdFromRequest(request);
  // if (!authenticatedUserId) {
  //   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  // }

  let connection;
  try {
    connection = await getConnection();

    // Optional: Verify ownership before deleting
    const [jobRows] = await connection.execute<RowDataPacket[]>(
      "SELECT provider_user_id FROM job_listings WHERE id = ?",
      [jobId]
    );

    if (jobRows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // const jobOwnerId = jobRows[0].provider_user_id;
    // if (authenticatedUserId && jobOwnerId !== authenticatedUserId) {
    //   return NextResponse.json({ error: 'Forbidden: You do not own this job listing' }, { status: 403 });
    // }
    // Skipping strict ownership check if authenticatedUserId is null (demo mode)

    await connection.beginTransaction(); // Start transaction

    // First, delete associated custom questions
    await connection.execute(
      "DELETE FROM job_custom_questions WHERE job_listing_id = ?",
      [jobId]
    );

    // Then, delete the job listing itself
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      "DELETE FROM job_listings WHERE id = ?",
      [jobId]
    );

    if (result.affectedRows > 0) {
      await connection.commit(); // Commit transaction
      return NextResponse.json({ message: "Job deleted successfully" });
    } else {
      await connection.rollback(); // Rollback if job itself wasn't found/deleted
      // This case might happen if the job was already deleted by another request,
      // or if the ID didn't exist (though the check above should catch it).
      return NextResponse.json(
        { error: "Failed to delete job or job not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    if (connection) await connection.rollback(); // Rollback on any error
    console.error("[JOB_ID_DELETE]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: `Failed to delete job: ${errorMessage}` },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

import type { CreateJobPayload } from "@/app/api/jobs/route"; // Re-use similar payload structure

export async function PUT(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  // In a real app, proper authentication and authorization are crucial here.
  const authenticatedUserId = await getAuthenticatedUserIdFromRequest(request); // Placeholder for auth
  // if (!authenticatedUserId) {
  //   return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  // }

  let connection;
  try {
    const body = (await request.json()) as Partial<CreateJobPayload>; // Partial because not all fields may be updated

    connection = await getConnection();

    // 1. Verify job exists and check ownership (if auth is implemented)
    const [jobRows] = await connection.execute<RowDataPacket[]>(
      "SELECT provider_user_id FROM job_listings WHERE id = ?",
      [jobId]
    );

    if (jobRows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // const jobOwnerId = jobRows[0].provider_user_id;
    // if (authenticatedUserId && jobOwnerId !== authenticatedUserId) {
    //  return NextResponse.json({ error: 'Forbidden: You do not own this job listing' }, { status: 403 });
    // }
    // Skipping strict ownership check if authenticatedUserId is null (demo mode)

    // 2. Construct the UPDATE query
    // We only update fields that are actually provided in the body.
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    // Map fields from CreateJobPayload (which is similar to form structure) to DB columns
    if (body.title !== undefined) {
      updateFields.push("title = ?");
      updateValues.push(body.title);
    }
    if (body.shortDescription !== undefined) {
      // Added shortDescription
      updateFields.push("short_description = ?");
      updateValues.push(
        body.shortDescription === null ? null : body.shortDescription
      );
    }
    if (body.description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(body.description);
    }
    if (body.companyNameOverride !== undefined) {
      updateFields.push("company_name_override = ?");
      updateValues.push(body.companyNameOverride);
    }
    if (body.location !== undefined) {
      updateFields.push("location = ?");
      updateValues.push(body.location);
    }
    if (body.jobType !== undefined) {
      updateFields.push("job_type = ?");
      updateValues.push(body.jobType);
    }
    if (body.experienceLevel !== undefined) {
      updateFields.push("experience_level = ?");
      updateValues.push(
        body.experienceLevel === null ? null : body.experienceLevel
      );
    }
    if (body.requiredSkills !== undefined) {
      updateFields.push("required_skills = ?");
      updateValues.push(
        body.requiredSkills === null ? null : body.requiredSkills
      );
    }
    if (body.howToApply !== undefined) {
      updateFields.push("how_to_apply = ?");
      updateValues.push(body.howToApply === null ? null : body.howToApply);
    }
    // Add salary fields if they are part of the update payload and need structured update
    // For simplicity, assuming they are not updated in this partial update example or handled as simple text if 'salary' field exists
    // if (body.salaryMin !== undefined) { updateFields.push('salary_min = ?'); updateValues.push(body.salaryMin); }
    // ... and so on for other salary fields

    if (updateFields.length === 0 && body.customQuestions === undefined) { // Check if customQuestions is also undefined
      return NextResponse.json(
        { message: "No fields to update and no custom questions provided" }, // Adjusted message
        { status: 400 }
      );
    }

    // Add updated_at manually if not handled by DB ON UPDATE CURRENT_TIMESTAMP for all changes
    // updateFields.push('updated_at = NOW()'); 

    await connection.beginTransaction(); // Start transaction

    let mainJobUpdated = false;
    if (updateFields.length > 0) {
      const updateQuery = `UPDATE job_listings SET ${updateFields.join(
        ", "
      )} WHERE id = ?`;
      updateValues.push(jobId);
      const [result] = await connection.execute<mysql.ResultSetHeader>(
        updateQuery,
        updateValues
      );
      if (result.affectedRows > 0) {
        mainJobUpdated = true;
      }
    }

    // 3. Handle custom questions (delete old, update existing, insert new)
    if (body.customQuestions !== undefined) {
      // Only process if customQuestions array is provided
      // Get existing question IDs for this job
      const [existingQuestionRows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM job_custom_questions WHERE job_listing_id = ?",
        [jobId]
      );
      const existingQuestionIds = existingQuestionRows.map((row: any) =>
        String(row.id)
      );

      const submittedQuestionIds = body.customQuestions
        .map((q) => q.id)
        .filter((id) => id !== undefined) as string[];

      // Questions to delete: in existingQuestionIds but not in submittedQuestionIds
      const questionsToDelete = existingQuestionIds.filter(
        (id) => !submittedQuestionIds.includes(id)
      );
      if (questionsToDelete.length > 0) {
        const deletePlaceholders = questionsToDelete.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM job_custom_questions WHERE job_listing_id = ? AND id IN (${deletePlaceholders})`,
          [jobId, ...questionsToDelete]
        );
      }

      // Update existing questions and insert new ones
      for (let i = 0; i < body.customQuestions.length; i++) {
        const q = body.customQuestions[i];
        if (q.id && existingQuestionIds.includes(q.id)) {
          // Update existing
          await connection.execute(
            `UPDATE job_custom_questions SET 
              question_label = ?, question_type = ?, options_list = ?, is_required = ?, display_order = ? 
             WHERE id = ? AND job_listing_id = ?`,
            [
              q.label,
              q.type,
              q.options === undefined ? null : q.options,
              q.isRequired,
              i,
              q.id,
              jobId,
            ]
          );
        } else {
          // Insert new
          await connection.execute(
            `INSERT INTO job_custom_questions 
              (job_listing_id, question_label, question_type, options_list, is_required, display_order) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              jobId,
              q.label,
              q.type,
              q.options === undefined ? null : q.options,
              q.isRequired,
              i,
            ]
          );
        }
      }
      mainJobUpdated = true; // Consider custom question changes as an update
    }

    if (mainJobUpdated) {
      await connection.commit();
      return NextResponse.json({ message: "Job updated successfully" });
    } else { // This case should ideally not be reached if the initial check for no updates is correct
      await connection.rollback();
      return NextResponse.json(
        { message: "No changes were made to the job listing." }, // More specific message
        { status: 200 } // Or 304 Not Modified, but 200 with message is also common
      );
    }

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[JOB_ID_PUT]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: `Failed to update job: ${errorMessage}` },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
