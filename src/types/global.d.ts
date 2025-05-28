// src/types/global.d.ts
import { RecaptchaVerifier } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: any; // To store the confirmation result for phone auth
  }
}
