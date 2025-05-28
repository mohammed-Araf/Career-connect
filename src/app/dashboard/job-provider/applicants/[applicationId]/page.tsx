"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, Mail, User, Briefcase, FileText, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ApiApplicationDetail } from '@/app/api/applications/[applicationId]/route'; // Import the detailed type
import { format } from 'date-fns';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const applicationId = params.applicationId as string;

  const [application, setApplication] = useState<ApiApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId && user && !authLoading) { // Ensure user is loaded before fetching
      setLoading(true);
      fetch(`/api/applications/${applicationId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Failed to fetch application details" }));
            throw new Error(errorData.message || `Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data: ApiApplicationDetail) => {
          setApplication(data);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to fetch application details:", err);
          setError(err.message || "Could not load application details.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!user && !authLoading) {
        setError("Authentication required to view application details.");
        setLoading(false);
    }
  }, [applicationId, user, authLoading]);

  if (loading || authLoading) {
    return <div className="flex flex-1 items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="space-y-6 text-center p-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="text-xl text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/job-provider/applicants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applicants
          </Link>
        </Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6 text-center p-4">
        <p className="text-xl text-muted-foreground">Application data not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/job-provider/applicants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applicants
          </Link>
        </Button>
      </div>
    );
  }
  
  const { seekerInfo, jobTitle, applicationDate, status, questionsAndAnswers, coverLetterText, resumeSnapshotUrl, notesForProvider } = application;

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild>
        <Link href="/dashboard/job-provider/applicants">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applicants List
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-1">Application for: {jobTitle}</CardTitle>
              <CardDescription>Submitted by: {seekerInfo.name}</CardDescription>
            </div>
            <Badge variant={status === 'Submitted' ? 'default' : 'secondary'} className="text-sm">{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><User className="mr-2 h-5 w-5 text-primary" />Applicant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><strong>Name:</strong> {seekerInfo.name}</p>
                <p><strong>Email:</strong> {seekerInfo.email}</p>
                <p><strong>Applied on:</strong> {format(new Date(applicationDate), "PPP p")}</p>
                {/* Placeholder for link to full profile - requires seeker profile page to exist and be accessible by provider */}
                {/* <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                  <Link href={`/dashboard/job-seeker/profile/${seekerInfo.firebaseUID}`}>View Full Profile</Link>
                </Button> */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" />Application Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {coverLetterText && <p><strong>Cover Letter:</strong> Provided (see below)</p>}
                {resumeSnapshotUrl && <p><strong>Resume:</strong> <a href={resumeSnapshotUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Resume</a></p>}
                {notesForProvider && <p><strong>Notes for Provider:</strong> Provided (see below)</p>}
                {!coverLetterText && !resumeSnapshotUrl && !notesForProvider && <p className="text-muted-foreground">No additional documents or notes submitted.</p>}
              </CardContent>
            </Card>
          </div>

          {coverLetterText && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Cover Letter</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{coverLetterText}</p></CardContent>
            </Card>
          )}

          {notesForProvider && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Notes for Provider</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{notesForProvider}</p></CardContent>
            </Card>
          )}
          
          {questionsAndAnswers && questionsAndAnswers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><HelpCircle className="mr-2 h-5 w-5 text-primary"/>Answers to Custom Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questionsAndAnswers.map((qa, index) => (
                  <div key={qa.questionId || index} className="pb-2">
                    <p className="font-semibold text-sm">{qa.questionLabel}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {qa.answer !== undefined && qa.answer !== null && qa.answer !== '' ? String(qa.answer) : <em>Not answered</em>}
                    </p>
                    {index < questionsAndAnswers.length - 1 && <Separator className="mt-3"/>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter>
            {/* Add actions like "Change Status", "Contact Applicant" etc. later */}
            <Button variant="secondary">Actions (Coming Soon)</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
