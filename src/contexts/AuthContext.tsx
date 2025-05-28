"use client";
import type { UserRole, User as AuthUserType } from '@/types';
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getJobSeekerProfile } from '@/lib/api'; // Import API functions
// import { doc, getDoc } from 'firebase/firestore'; // Removed Firebase imports
// import { db } from '@/lib/firebase'; // Removed Firebase imports

interface AuthContextType {
  user: AuthUserType | null;
  login: (user: AuthUserType) => void;
  logout: () => void;
  loading: boolean;
  updateUserRole: (role: UserRole) => void;
  updateProfileCompletion: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize user as null, will be populated from localStorage or after login
  const [user, setUser] = useState<AuthUserType | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfileCompletion = useCallback(async (userId: string): Promise<boolean> => {
    try {
      console.log(`AuthContext: Fetching profile for ${userId}`);
      const profile = await getJobSeekerProfile(userId);
      console.log('AuthContext: Profile fetched:', profile);
      return profile?.profileCompleted || false;
    } catch (error) {
      console.error('AuthContext: Error fetching profile status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    // This effect runs on initial mount to load user from localStorage or use dummy,
    // and then check actual profile completion status from the backend.
    const initialLoad = async () => {
      // let currentUser = user; // Start with the pre-set dummy user // No longer needed
      let currentUser: AuthUserType | null = null; 

      const storedUserJson = localStorage.getItem('careerConnectUser');
      if (storedUserJson) {
        currentUser = JSON.parse(storedUserJson) as AuthUserType;
      }

      if (currentUser) {
        const isCompleted = await fetchProfileCompletion(currentUser.id);
        // Update user state with the fetched profileCompleted status
        const hydratedUser = { ...currentUser, profileCompleted: isCompleted };
        setUser(hydratedUser);
      }
      // setLoading(false) should be called regardless of whether a user was found or not,
      // to indicate that the initial loading attempt (from localStorage and profile check) is done.
      setLoading(false); 
    };

    initialLoad();
  }, [fetchProfileCompletion]);


  const login = useCallback(async (loggedInUser: AuthUserType) => {
    setLoading(true);
    // Use the ID and email from the actual loggedInUser object,
    // which should come from your Firebase authentication flow.
    const actualUserBase = {
      id: loggedInUser.id, // Use the ID from the logged-in user
      email: loggedInUser.email,
      // Assuming role is determined here or passed in loggedInUser; defaulting to job-seeker for now
      role: (loggedInUser.role || 'job-seeker') as UserRole, 
    };

    try {
      // Fetch profile completion status for this *actual* user ID
      const isCompleted = await fetchProfileCompletion(actualUserBase.id);
      const fullUserToSet = { ...actualUserBase, profileCompleted: isCompleted };
      
      setUser(fullUserToSet);
      localStorage.setItem('careerConnectUser', JSON.stringify(fullUserToSet));

      if (fullUserToSet.role === 'job-seeker') {
        if (isCompleted) {
          router.push('/dashboard/job-seeker');
        } else {
          router.push('/dashboard/job-seeker/profile-setup');
        }
      } else if (fullUserToSet.role === 'job-provider') {
        router.push('/dashboard/job-provider');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Login error / Error fetching profile completion for user:", actualUserBase.id, error);
      // Fallback for new user if fetch fails (e.g. network error before API can 404 for new profile)
      const fallbackUserOnError = { ...actualUserBase, profileCompleted: false };
      setUser(fallbackUserOnError);
      localStorage.setItem('careerConnectUser', JSON.stringify(fallbackUserOnError));
      router.push('/dashboard/job-seeker/profile-setup'); // Sensible fallback for job-seeker
    } finally {
      setLoading(false);
    }
  }, [router, fetchProfileCompletion]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('careerConnectUser');
    router.push('/login');
  }, [router]);

  const updateUserRole = useCallback((role: UserRole) => {
    setUser(prevUser => {
      if (prevUser) {
        const updatedUser = { ...prevUser, role };
        localStorage.setItem('careerConnectUser', JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    });
  }, []);

  const updateProfileCompletion = useCallback((status: boolean) => {
    setUser(prevUser => {
      if (prevUser) {
        const updatedUser = { ...prevUser, profileCompleted: status };
        localStorage.setItem('careerConnectUser', JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    });
  }, []);
  
  useEffect(() => {
    // For local development, ensure we land on the profile setup page if a job seeker,
    // or dashboard if other role.
    if (!loading && user) {
      if (user.role === 'job-seeker' && !user.profileCompleted && pathname !== '/dashboard/job-seeker/profile-setup' && !pathname.startsWith('/dashboard/job-seeker/profile-setup/')) {
        // Allow staying on sub-pages of profile-setup if needed.
        router.push('/dashboard/job-seeker/profile-setup');
      } else if (
        user.role === 'job-provider' &&
        !pathname.startsWith('/dashboard/job-provider') && // Not in their provider section
        !pathname.startsWith('/dashboard/jobs') &&         // Not viewing a generic job detail page
        pathname !== '/dashboard'                           // Not on the main dashboard page
      ) {
        // If a job provider is not in their section, not viewing a job, and not on main dashboard, redirect to their dashboard.
        router.push('/dashboard/job-provider');
      } else if (
        user.role === undefined && // Or handle other roles explicitly if they exist
        pathname !== '/dashboard' &&
        !pathname.startsWith('/dashboard/') // Avoid redirect if already on some dashboard page but role is temp undefined
      ) { 
        // If role is undefined and not on any dashboard path, redirect to base dashboard.
        // This condition might need refinement based on how 'undefined' role is handled or if other roles exist.
        router.push('/dashboard');
      }
    } else if (!loading && !user && !['/login', '/signup'].includes(pathname)) {
      // If no user and not on login/signup, redirect to login (for when we revert changes)
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUserRole, updateProfileCompletion }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
