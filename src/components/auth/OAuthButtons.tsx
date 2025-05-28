"use client";
import { Button } from "@/components/ui/button";
import { Smartphone } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber
} from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
import React, { useEffect } from 'react';
import { FirebaseError } from 'firebase/app';
import { getUserInfo, createUserInDb } from '@/lib/api'; // Import API helpers
import type { UserRole } from '@/types'; // Import UserRole

// Placeholder SVG for Google Icon
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C14.03,4.73 15.69,5.36 16.95,6.57L19.05,4.47C17.22,2.77 15,2 12.19,2C6.92,2 2.73,6.09 2.73,12C2.73,17.91 6.92,22 12.19,22C17.6,22 21.54,18.33 21.54,12.36C21.54,11.77 21.48,11.43 21.35,11.1Z"/></svg>
);

// Placeholder SVG for Microsoft Icon
const MicrosoftIcon = () => (
 <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.2075 2.00244H2V12.21H11.2075V2.00244ZM22 2.00244H12.7925V12.21H22V2.00244ZM11.2075 13.7923H2V21.9998H11.2075V13.7923ZM22 13.7923H12.7925V21.9998H22V13.7923Z"/></svg>
);

interface OAuthButtonsProps {
  type?: 'login' | 'signup';
  selectedRole?: UserRole; // For signup: pass the role selected in the form
}

export function OAuthButtons({ type = 'login', selectedRole }: OAuthButtonsProps) {
  const { login: callAuthContextLogin } = useAuth(); // Renamed to avoid confusion
  const actionText = type === 'login' ? 'Log in' : 'Sign up';

  useEffect(() => {
    // Initialize RecaptchaVerifier for phone authentication
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          // This callback is fired when the reCAPTCHA challenge is successfully completed.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          toast({
            title: "reCAPTCHA Expired",
            description: "Please try again.",
            variant: "destructive",
          });
        }
      });
    }
  }, []);

  const handleOAuthSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      console.log("OAuthButtons - received 'type' prop:", type); // DEBUG LOG
      console.log("OAuthButtons - received 'selectedRole' prop:", selectedRole); // DEBUG LOG

      let finalRole: UserRole = 'job-seeker'; // Default
      let finalEmail = firebaseUser.email || '';
      const finalName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';

      try {
        // Check if user exists in our DB
        const dbUserInfo = await getUserInfo(firebaseUser.uid);
        finalRole = dbUserInfo.role;
        finalEmail = dbUserInfo.email || finalEmail;
        console.log(`OAuth: User ${firebaseUser.uid} found in DB with role ${finalRole}`);
      } catch (error: any) {
        if (error.message && error.message.includes("User record not found")) {
          // New user to our application, create them in DB
          console.log(`OAuth: User ${firebaseUser.uid} not found in DB. Creating new user.`);
          console.log(`OAuthButtons: Initial selectedRole prop for signup:`, selectedRole); // Log initial prop

          let roleForDb: UserRole;
          if (type === 'signup' && selectedRole === 'job-provider') {
            roleForDb = 'job-provider';
          } else {
            roleForDb = 'job-seeker'; // Default to 'job-seeker' for all other cases (signup with no/invalid role, or login type)
            if (type === 'signup' && selectedRole && selectedRole !== 'job-seeker') {
              // Log if selectedRole was something other than 'job-seeker' or 'job-provider' during signup
              console.warn(`OAuthButtons: selectedRole was '${selectedRole}', defaulting to 'job-seeker' for DB creation.`);
            }
          }
          
          console.log("OAuthButtons - Final 'roleForDb' for DB:", roleForDb);
          finalRole = roleForDb; // Update finalRole with the strictly determined role.

          const userToCreate = {
            firebaseUID: firebaseUser.uid,
            email: finalEmail,
            role: roleForDb,
          };
          console.log("OAuthButtons - Payload for createUserInDb:", userToCreate); // Log the exact payload

          try {
            await createUserInDb(userToCreate);
            console.log(`OAuth: User ${firebaseUser.uid} created in DB with role ${roleForDb}`);
          } catch (dbCreateError: any) {
            console.error("OAuth: Failed to save new user to DB:", dbCreateError.message);
            toast({
              title: "Signup Issue",
              description: `Account created with ${provider.providerId.split('.')[0]}, but DB save failed: ${dbCreateError.message}. Contact support.`,
              variant: "destructive",
            });
            return; // Stop if DB creation fails
          }
        } else {
          // Other error fetching user info, log it and proceed with default role
          console.error("OAuth: Error fetching user info from DB:", error.message);
          toast({ title: "Warning", description: "Could not fully verify user details." });
        }
      }

      callAuthContextLogin({ 
        id: firebaseUser.uid, 
        email: finalEmail, 
        role: finalRole,
        name: finalName
      });
      toast({
        title: `${actionText} Successful`,
        description: `You have been successfully ${actionText.toLowerCase()} with ${provider.providerId.split('.')[0]}.`,
      });
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'Authentication popup closed. Please try again.';
            break;
          case 'auth/cancelled-popup-request':
            errorMessage = 'Authentication popup already opened. Please complete the current one.';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'An account with this email already exists. Try logging in with a different method.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePhoneSignIn = async () => {
    const phoneNumber = prompt("Please enter your phone number (e.g., +11234567890):");
    if (!phoneNumber) return;

    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        toast({
          title: "Error",
          description: "reCAPTCHA not initialized. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      const verificationCode = prompt("Please enter the verification code sent to your phone:");
      if (verificationCode) {
        await confirmationResult.confirm(verificationCode);
        // Similar logic as above for phone auth if it's a new user vs existing
        // This part is more complex as phone users might not have an email/displayName from Firebase initially.
        // For now, keeping it simple and defaulting role.
        // A more complete solution would involve checking DB, creating user in DB if new.
        let phoneUserRole: UserRole = 'job-seeker';
        if (auth.currentUser) {
          try {
            const dbUserInfo = await getUserInfo(auth.currentUser.uid);
            phoneUserRole = dbUserInfo.role;
          } catch (e) {
            // New user or error, default to job-seeker
            // If new, should ideally call createUserInDb
            console.warn("Phone Signin: could not fetch user role, defaulting.", e);
          }
        }

        callAuthContextLogin({ 
          id: auth.currentUser?.uid || '', 
          email: auth.currentUser?.email || '', // Might be null for phone auth
          role: phoneUserRole, 
          name: auth.currentUser?.displayName || auth.currentUser?.phoneNumber || 'User' 
        });
        toast({
          title: `${actionText} Successful`,
          description: `You have been successfully ${actionText.toLowerCase()} with phone.`,
        });
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-phone-number':
            errorMessage = 'The phone number is not valid.';
            break;
          case 'auth/missing-phone-number':
            errorMessage = 'Please provide a phone number.';
            break;
          case 'auth/quota-exceeded':
            errorMessage = 'SMS quota exceeded. Please try again later.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again later.';
            break;
          case 'auth/code-expired':
            errorMessage = 'The verification code has expired.';
            break;
          case 'auth/invalid-verification-code':
            errorMessage = 'The verification code is invalid.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(new GoogleAuthProvider())}>
        <GoogleIcon />
        {actionText} with Google
      </Button>
      <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(new OAuthProvider('microsoft.com'))}>
        <MicrosoftIcon />
        {actionText} with Microsoft
      </Button>
       <Button variant="outline" className="w-full" onClick={handlePhoneSignIn}>
        <Smartphone className="mr-2 h-4 w-4" />
        {actionText} with Phone
      </Button>
      <div id="recaptcha-container"></div> {/* reCAPTCHA container */}
    </div>
  );
}
