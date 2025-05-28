
"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"; // Removed Edit, Trash2, Eye as they are in JobListingCard
import { JobListingCard } from "@/components/dashboard/JobListingCard";
import type { Job as JobCardType } from "@/types";
import type { ApiJob } from "@/app/api/jobs/route";
import { useToast } from "@/hooks/use-toast"; // For delete confirmation/error
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // For confirmation

export default function MyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<ApiJob | null>(null); // For confirmation dialog

  const fetchListings = useCallback(() => {
    if (!authLoading && user && user.id) {
      setLoading(true);
      fetch(`/api/jobs?providerFirebaseUID=${user.id}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Failed to fetch listings" }));
            throw new Error(errorData.message || `Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setJobs(data.jobs || []);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to fetch job listings:", err);
          setError(err.message || "Could not load your job listings.");
          setJobs([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!authLoading && !user) {
      setError("You must be logged in to view your listings.");
      setLoading(false);
      setJobs([]);
    } else if (authLoading) {
      setLoading(true); // Ensure loading is true while auth is resolving
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDeleteJob = async (jobId: string) => {
    if (!user || !user.id) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          // Send Firebase UID in a header for the API to perform ownership check if implemented
          'X-User-Firebase-UID': user.id, 
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete job" }));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      toast({ title: "Success", description: "Job listing deleted successfully." });
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId)); // Optimistic update
      // Or call fetchListings() again for a full refresh
    } catch (err) {
      console.error("Error deleting job:", err);
      toast({ title: "Error", description: (err as Error).message || "Could not delete job listing.", variant: "destructive" });
    } finally {
      setJobToDelete(null); // Close dialog
    }
  };

  // Quick mapping from ApiJob to JobCardType if needed, or adjust JobListingCard
  // For now, assuming direct compatibility or that JobListingCard is flexible.
  // If JobListingCard strictly needs `Job` from `@/types`, a mapping function would be:
  const mapApiJobToJobCardType = (apiJob: ApiJob): JobCardType => ({
    id: apiJob.id,
    title: apiJob.title,
    company: apiJob.company,
    location: apiJob.location,
    shortDescription: apiJob.shortDescription,
    description: apiJob.description,
    type: apiJob.jobType, // Note: property name difference
    experienceLevel: apiJob.experienceLevel,
    postedDate: apiJob.postedDate,
    salary: apiJob.salary || undefined, // Ensure optional fields are handled
    skills: apiJob.skills,
    companyLogoUrl: apiJob.companyLogoUrl || undefined,
    applyUrl: apiJob.applyUrl || undefined,
  });


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
          <CardTitle className="text-2xl">My Job Listings</CardTitle>
          <CardDescription>View, edit, or manage your current job postings.</CardDescription>
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
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">You have not posted any jobs yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobListingCard 
                  key={job.id} 
                  job={mapApiJobToJobCardType(job)} 
                  showAdminActions={true}
                  onDeleteJob={() => setJobToDelete(job)} // Open confirmation dialog
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {jobToDelete && (
        <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the job listing
                "{jobToDelete.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteJob(jobToDelete.id)}>
                Yes, delete listing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
