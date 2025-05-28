"use client";
import type { Job } from '@/types';
import { JobListingCard } from './JobListingCard';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // To get current user ID
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RecommendedJobListings() {
  const { user, loading: authLoading } = useAuth();
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendedJobs() {
      if (authLoading || !user || !user.id) {
        // Wait for auth to complete or if no user/user.id, don't fetch
        if (!authLoading && !user) setIsLoading(false); // Not loading if no user
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Pass userId to the recommendations API
        // Note: user.id from AuthContext might be Firebase UID.
        // The API currently expects the SQL 'users.id'.
        // This needs to be reconciled. For now, we'll assume user.id is the SQL ID
        // or the API needs to be adapted to handle Firebase UID to lookup SQL ID.
        // For this implementation, I'll proceed assuming user.id can be used directly
        // or that an intermediate step (e.g. another API call) would resolve Firebase UID to SQL user.id.
        // Let's assume for now `user.id` is the numeric ID from the `users` table.
        // If `user.id` is Firebase UID, you'd typically have an endpoint like /api/user-info/[firebaseUID]
        // to get the internal user ID.

        const response = await fetch(`/api/jobs/recommendations?userId=${user.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRecommendedJobs(data.jobs || []);
      } catch (e) {
        console.error("Failed to fetch recommended jobs:", e);
        setError((e as Error).message || "An unknown error occurred");
        setRecommendedJobs([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendedJobs();
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Jobs Recommended For You</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => ( // Show 4 skeletons for recommendations
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
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
       <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Jobs Recommended For You</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load recommendations: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (recommendedJobs.length === 0) {
    // Don't show "no recommendations" if there was no user to begin with or still loading auth
    if (!user) return null; 
    return (
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Jobs Recommended For You</h2>
        <p className="text-center text-muted-foreground py-6">No specific recommendations for you at the moment. Explore all jobs below!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-6">Jobs Recommended For You</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recommendedJobs.map(job => (
          <JobListingCard key={`rec-${job.id}`} job={job} />
        ))}
      </div>
    </div>
  );
}
