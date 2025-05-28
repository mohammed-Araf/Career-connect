"use client";
import Link from 'next/link';
import { AuthForm, loginSchema, signupSchema, LoginFormValues, SignupFormValues } from '@/components/auth/AuthForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
// import * as z from "zod"; // No longer needed here
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserRole } from '@/types';

// Schemas and types are now imported from AuthForm.tsx

export default function LoginPage() {
  const [formType, setFormType] = useState<'login' | 'signup'>('login');
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormValues | SignupFormValues>({
    resolver: zodResolver(formType === "login" ? loginSchema : signupSchema),
    defaultValues: formType === "login"
      ? { email: "", password: "" }
      : { name: "", email: "", password: "", role: "job-seeker" as UserRole },
  });

  const watchedRole = form.watch("role") as UserRole | undefined; // Watch the role field

  useEffect(() => {
    // Reset form when formType changes
    form.reset(formType === "login"
      ? { email: "", password: "" }
      : { name: "", email: "", password: "", role: "job-seeker" as UserRole });
  }, [formType, form]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const toggleFormType = () => {
    setFormType((prevType) => (prevType === 'login' ? 'signup' : 'login'));
  };

  // This function is not strictly needed anymore as OAuthButtons handles its own logic
  // but keeping it for potential future use or if other non-OAuth actions are added.
  const handleExternalAuthAction = (provider: string) => {
    toast({
      title: "Coming Soon!",
      description: `${provider} authentication is not yet implemented.`,
      variant: "default",
    });
  };

  if (loading || (!loading && user)) {
    return <div className="flex min-h-screen items-center justify-center"><Briefcase className="h-12 w-12 animate-pulse text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <Link href="/" className="flex items-center space-x-2 text-primary mb-8">
          <Briefcase className="h-10 w-10" />
          <span className="text-3xl font-bold">{siteConfig.name}</span>
        </Link>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            {formType === 'login' ? 'Welcome Back!' : 'Create an Account'}
          </CardTitle>
          <CardDescription>
            {formType === 'login'
              ? `Log in to continue to ${siteConfig.name}.`
              : `Sign up to get started with ${siteConfig.name}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AuthForm 
            type={formType} 
            showRoleSelector={formType === 'signup'} 
            formInstance={form}
          />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <OAuthButtons
            type={formType}
            selectedRole={formType === 'signup' ? watchedRole : undefined}
          />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {formType === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Button variant="link" onClick={toggleFormType} className="p-0 h-auto">
              {formType === 'login' ? 'Sign up' : 'Log in'}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
