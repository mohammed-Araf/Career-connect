import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import type { UserRole } from '@/types'; // Assuming UserRole is exported from your types

interface CreateUserRequestBody {
  firebaseUID: string;
  email: string;
  role: UserRole;
  // name?: string; // Name is not in the 'users' table schema provided
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json() as CreateUserRequestBody;
    const { firebaseUID, email } = body;
    let role = body.role; // Make role mutable for sanitization

    if (!firebaseUID || !email) { // Role can be sanitized, so not strictly required in the initial check
      return NextResponse.json({ message: 'Firebase UID and email are required.' }, { status: 400 });
    }

    let finalRoleForDB: UserRole;
    if (body.role === 'job-provider') {
      finalRoleForDB = 'job-provider';
    } else {
      // This includes body.role === 'job-seeker', or body.role being undefined/null/empty/invalid
      if (body.role && body.role !== 'job-seeker') {
        console.warn(`API /api/users: Received invalid role '${body.role}' from client for firebaseUID ${firebaseUID}. Defaulting to 'job-seeker'.`);
      }
      finalRoleForDB = 'job-seeker';
    }
    console.log(`API /api/users: Attempting to process user creation for firebaseUID: ${firebaseUID}, email: ${email}, received role from client: '${body.role}', role to be inserted: '${finalRoleForDB}'`);

    connection = await getConnection();

    // Check if user already exists by firebase_uid to prevent duplicates
    const [existingUserRows]: any[] = await connection.execute(
      'SELECT id FROM users WHERE firebase_uid = ?',
      [firebaseUID]
    );

    if (existingUserRows.length > 0) {
      console.log(`API /api/users: User with firebaseUID ${firebaseUID} already exists in users table. ID: ${existingUserRows[0].id}`);
      return NextResponse.json({ message: 'User already exists.', userId: existingUserRows[0].id }, { status: 200 });
    }

    const sql = 'INSERT INTO users (firebase_uid, email, role) VALUES (?, ?, ?)';
    const valuesToInsert = [firebaseUID, email, finalRoleForDB];
    console.log(`API /api/users: Executing SQL: ${sql} with values:`, JSON.stringify(valuesToInsert));
    
    const [result]: any[] = await connection.execute(sql, valuesToInsert);

    console.log(`API /api/users: User created successfully for firebaseUID ${firebaseUID}. Insert ID: ${result.insertId}`);
    return NextResponse.json({ message: 'User created successfully', userId: result.insertId }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    // Handle specific SQL errors like duplicate email if needed (though firebase_uid is primary concern here)
    if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'Error creating user: Duplicate entry.', error: error.message }, { status: 409 });
    }
    // Return the actual error message from the database or a more specific message
    const errorMessage = error.message || 'An unknown error occurred while creating the user.';
    return NextResponse.json({ message: `Error creating user: ${errorMessage}`, error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
