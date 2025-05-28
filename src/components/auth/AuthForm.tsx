"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";
import { Loader2 } from "lucide-react";
import React from "react";
import { auth } from '@/lib/firebase';
import { 
  // Control, FieldValues, UseFormReturn were incorrectly added here
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  UserCredential
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { toast } from "@/hooks/use-toast";
import { getUserInfo, createUserInDb } from '@/lib/api';

// Export schemas and types for use in LoginPage
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['job-seeker', 'job-provider'], { required_error: "You must select a role." }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;

// Correct imports for react-hook-form types
import { UseFormReturn as RHFUseFormReturn, Control as RHFControl } from "react-hook-form";


interface AuthFormProps {
  type: "login" | "signup";
  showRoleSelector?: boolean;
  // Allow parent to pass form instance for state sharing
  formInstance?: RHFUseFormReturn<LoginFormValues | SignupFormValues>; 
}

export function AuthForm({ type, showRoleSelector = false, formInstance }: AuthFormProps) {
  const { login: callAuthContextLogin } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  // Use passed formInstance if available, otherwise create one locally
  const localForm = useForm<LoginFormValues | SignupFormValues>({
    resolver: zodResolver(type === "login" ? loginSchema : signupSchema),
    defaultValues: type === "login" 
      ? { email: "", password: "" } 
      : { name: "", email: "", password: "", role: "job-seeker" as UserRole },
  });
  const form = formInstance || localForm;

  type FormValues = LoginFormValues | SignupFormValues; // This can stay as is

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    let userCredential: UserCredential | null = null;

    try {
      if (type === "login") {
        const { email, password } = values as LoginFormValues;
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        let roleFromDb: UserRole = 'job-seeker'; // Default
        let emailFromDb = userCredential.user.email || '';

        try {
          const dbUserInfo = await getUserInfo(userCredential.user.uid);
          roleFromDb = dbUserInfo.role;
          emailFromDb = dbUserInfo.email || emailFromDb;
        } catch (dbError: any) {
          console.error("Login: Failed to fetch user info from DB:", dbError.message);
          if (dbError.message && dbError.message.includes("User record not found")) {
            // New Firebase user, not in our DB. Default role and proceed.
            // POST /api/profile will create them in 'users' table as 'job_seeker'
            // Or, if role selection should happen first, this flow needs adjustment.
            roleFromDb = 'job-seeker'; 
            toast({ title: "Welcome!", description: "Please complete your profile." });
          } else {
            toast({
              title: "Login Warning",
              description: "Could not fully verify user details. Defaulting role.",
              variant: "destructive" 
            });
          }
        }

        callAuthContextLogin({ 
          id: userCredential.user.uid, 
          email: emailFromDb, 
          role: roleFromDb,
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User' 
        });
        toast({ title: "Login Successful" });

      } else { // Signup
        const { email, password, name, role } = values as SignupFormValues;
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        try {
          await createUserInDb({
            firebaseUID: userCredential.user.uid,
            email: userCredential.user.email || email,
            role: role,
          });
          toast({ title: "Account Created", description: "User details saved to database." });
        } catch (dbCreateError: any) {
          console.error("Signup: Failed to save user to DB:", dbCreateError.message);
          toast({
            title: "Signup Issue",
            description: `Firebase account created, but DB save failed: ${dbCreateError.message}. Contact support.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return; // Critical failure, stop here
        }
        
        callAuthContextLogin({ 
          id: userCredential.user.uid, 
          email: userCredential.user.email || email, 
          name, 
          role 
        });
        // Success toast for signup might be redundant if login flow shows one, or keep for clarity.
      }
    } catch (error: any) { // Catches Firebase errors or re-thrown errors
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use': errorMessage = 'Email already in use.'; break;
          case 'auth/invalid-email': errorMessage = 'Invalid email.'; break;
          case 'auth/operation-not-allowed': errorMessage = 'Operation not allowed.'; break;
          case 'auth/weak-password': errorMessage = 'Password is too weak.'; break;
          case 'auth/user-not-found':
          case 'auth/wrong-password': errorMessage = 'Invalid credentials.'; break;
          default: errorMessage = error.message;
        }
      } else { // Catch other errors (e.g., from our API calls if rethrown)
        errorMessage = error.message || "An unknown error occurred.";
      }
      toast({
        title: type === "login" ? "Login Failed" : "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {type === "signup" && (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {type === "signup" && showRoleSelector && (
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>I am a...</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value} // Changed from defaultValue to value
                    className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="job-seeker" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Job Seeker
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="job-provider" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Job Provider / Employer
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {type === "login" ? "Log In" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
