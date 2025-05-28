import type { UserRole } from '@/types'; // Import UserRole

const API_BASE_URL = '/api'; // Point to Next.js internal API routes

export interface EducationEntry { // Assuming a structure for education entries, adjust as needed
  level: string;
  institutionName: string;
  institutionAddress: string;
  course?: string;
  joinYear: string;
  passOutYear?: string;
  isDiploma?: boolean;
  isStudying?: boolean; // If you track this per entry or globally
}

export interface JobSeekerProfile {
  id: string; // Corresponds to firebase_uid
  fullName: string;
  headline?: string;
  bio?: string;
  resumeUrl?: string; // Changed from resume_url for camelCase consistency
  portfolioUrl?: string; // Changed from portfolio_url
  linkedinProfileUrl?: string; // Changed from linkedin_profile_url
  skills?: string; // Stored as TEXT, could be comma-separated or JSON string
  contactNumber?: string;
  address?: string; // Stored as TEXT
  experience?: string; // Stored as TEXT
  yearsOfExperience?: string; // Stored as VARCHAR
  education?: EducationEntry[]; // Stored as JSON string in TEXT column
  profileCompleted: boolean;
  email?: string; // Included because it's used in POST /api/profile for new user creation
}

export async function saveJobSeekerProfile(profileData: JobSeekerProfile) {
  console.log('saveJobSeekerProfile called with:', profileData); // Debug log
  const response = await fetch(`${API_BASE_URL}/profile`, { // Corrected endpoint
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: profileData.id, profileData: profileData }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save profile via API.');
  }

  return response.json();
}

export interface UserInfoFromDB {
  email: string | null;
  role: UserRole; // UserRole should be imported or defined if not already
}

export async function getUserInfo(firebaseUID: string): Promise<UserInfoFromDB> {
  console.log('getUserInfo called for firebaseUID:', firebaseUID);
  const response = await fetch(`${API_BASE_URL}/user-info/${firebaseUID}`);

  if (!response.ok) {
    // If user not found in DB (404), or other error, throw to be caught by caller
    const errorData = await response.json().catch(() => ({ message: 'Failed to get user info, and error response was not JSON.' }));
    throw new Error(errorData.message || `Failed to get user info. Status: ${response.status}`);
  }
  return response.json();
}

interface CreateUserPayload {
  firebaseUID: string;
  email: string;
  role: UserRole;
  // name?: string; // Not storing name in users table for now
}

export async function createUserInDb(userData: CreateUserPayload): Promise<{ message: string; userId: number }> {
  console.log('createUserInDb called with:', userData);
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create user in DB, and error response was not JSON.' }));
    throw new Error(errorData.message || `Failed to create user in DB. Status: ${response.status}`);
  }
  return response.json();
}

export async function getJobSeekerProfile(userId: string): Promise<JobSeekerProfile | null> {
  console.log('getJobSeekerProfile called for userId:', userId); // Debug log
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`); // Corrected endpoint

  if (response.status === 404) {
    return null; // Profile not found
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch profile via API.');
  }

  return response.json();
}
