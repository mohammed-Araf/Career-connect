
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle, UserCircle, Mail, Briefcase, CalendarDays } from "lucide-react";
import type { ApiApplicant } from "@/app/api/applications/route"; // Type for applicants fetched
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';


export default function ApplicantsPage() {
  const { user, loading: authLoading } = useAuth();
  const [applicants, setApplicants] = useState<ApiApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && user.id) {
      setLoading(true);
      fetch(`/api/applications?providerId=${user.id}`) // Fetch all applicants for this provider's jobs
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Failed to fetch applicants" }));
            throw new Error(errorData.message || `Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.applicants) {
            setApplicants(data.applicants);
          } else {
            setApplicants([]);
          }
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to fetch applicants:", err);
          setError(err.message || "Could not load applicants.");
          setApplicants([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!authLoading && !user) {
      setError("You must be logged in to view applicants.");
      setLoading(false);
    }
  }, [user, authLoading]);

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild>
        <Link href="/dashboard/job-provider">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Applicant Tracking</CardTitle>
          <CardDescription>Review and manage applications for your job posts.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading || authLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-red-500 flex items-center justify-center py-10">
              <AlertTriangle className="mr-2 h-6 w-6" /> {error}
            </div>
          ) : applicants.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No applicants found for your job postings yet.</p>
          ) : (
            <div className="space-y-4">
              {applicants.map((applicant) => (
                <Card key={applicant.applicationId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{applicant.seekerName}</CardTitle>
                        <Badge variant={applicant.status === 'Submitted' ? 'default' : 'secondary'}>{applicant.status}</Badge>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                      Applied for: <span className="font-medium text-foreground">{applicant.jobTitle}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                     <div className="flex items-center text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4 text-primary" /> {applicant.seekerEmail}
                     </div>
                     <div className="flex items-center text-muted-foreground">
                        <CalendarDays className="mr-2 h-4 w-4 text-primary" /> 
                        Applied {formatDistanceToNow(new Date(applicant.applicationDate), { addSuffix: true })}
                     </div>
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/job-provider/applicants/${applicant.applicationId}`}>
                        View Application
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
