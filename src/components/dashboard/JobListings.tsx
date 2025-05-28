"use client";
import type { Job } from '@/types';
import { JobListingCard } from './JobListingCard';
import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { ApiJob } from '@/app/api/jobs/route'; // To match API response type

interface SearchParams {
  searchTerm: string;
  experience: string;
  location: string;
}

interface JobListingsProps {
  searchParams?: SearchParams; // Make optional if it can be used without search
}

// Mapping function if ApiJob and Job types differ significantly for JobListingCard
const mapApiJobToJobType = (apiJob: ApiJob): Job => ({
  id: apiJob.id,
  title: apiJob.title,
  company: apiJob.company,
  location: apiJob.location,
  shortDescription: apiJob.shortDescription,
  description: apiJob.description,
  type: apiJob.jobType, // Key difference: jobType in ApiJob vs type in Job
  experienceLevel: apiJob.experienceLevel,
  postedDate: apiJob.postedDate,
  salary: apiJob.salary || undefined,
  skills: apiJob.skills,
  companyLogoUrl: apiJob.companyLogoUrl || undefined,
  applyUrl: apiJob.applyUrl || undefined,
  // customQuestions are not part of ApiJob by default, but Job type now has it.
  // If ApiJob is extended to include customQuestions, map them here.
  customQuestions: [], // Default to empty if not provided by ApiJob
});


export function JobListings({ searchParams }: JobListingsProps) {
  const [jobs, setJobs] = useState<ApiJob[]>([]); // Store as ApiJob from fetch
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const query = new URLSearchParams();
    if (searchParams?.searchTerm) query.append('searchTerm', searchParams.searchTerm);
    if (searchParams?.location) query.append('location', searchParams.location);
    if (searchParams?.experience) query.append('experience', searchParams.experience);
    // Add other filters like jobType if needed

    const apiUrl = `/api/jobs?${query.toString()}`;
    console.log("JobListings: Fetching jobs with URL:", apiUrl); // Log the API URL

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch jobs" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setJobs(data.jobs || []); 
    } catch (e) {
      console.error("Failed to fetch jobs:", e);
      setError((e as Error).message || "An unknown error occurred");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]); // Re-fetch when searchParams change

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, index) => ( // Show 8 skeletons for better layout feel
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-16 w-16 rounded-md" />
                <div className="flex-grow space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Skeleton className="h-10 w-24 mr-2" />
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 py-10">Error fetching job listings: {error}</p>;
  }
  
  if (jobs.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No job listings found matching your criteria.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {jobs.map(apiJob => (
        <JobListingCard key={apiJob.id} job={mapApiJobToJobType(apiJob)} />
      ))}
    </div>
  );
}
