import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import type { UserRole } from '@/types'; // Assuming UserRole is exported from your types

interface UserInfo {
  email: string | null;
  role: UserRole;
  // Add other fields from 'users' table if needed, e.g., name, if you store it there
}

export async function GET(request: NextRequest, { params: paramsPromise }: { params: { firebaseUID: string } }) { // Renamed for clarity
  let connection;
  try {
    const params = await paramsPromise; // Await the params object
    const firebaseUID = params.firebaseUID;

    if (!firebaseUID) {
      return NextResponse.json({ message: 'Firebase UID is required.' }, { status: 400 });
    }

    connection = await getConnection();

    const [userRows]: any[] = await connection.execute(
      'SELECT email, role FROM users WHERE firebase_uid = ?',
      [firebaseUID]
    );

    if (userRows.length === 0) {
      // This case means the user authenticated with Firebase, but doesn't have a record in your 'users' table yet.
      // This might happen if signup didn't create the DB record, or for a new Firebase user before any app-specific DB interaction.
      // For now, return 404. The frontend AuthForm will need to handle this (e.g., by treating as a new user needing role assignment or default).
      return NextResponse.json({ message: 'User record not found in database.' }, { status: 404 });
    }
    
    const dbUser = userRows[0];
    const userInfo: UserInfo = {
      email: dbUser.email,
      role: dbUser.role as UserRole,
    };

    return NextResponse.json(userInfo, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({ message: 'Error fetching user info', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
