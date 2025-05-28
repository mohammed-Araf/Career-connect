
"use client";
import { useEffect, useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { JobSearchBar } from '@/components/dashboard/JobSearchBar';
import { JobListings } from '@/components/dashboard/JobListings';
import { RecommendedJobListings } from '@/components/dashboard/RecommendedJobListings';
import { Loader2 } from 'lucide-react';

interface SearchParams {
  searchTerm: string;
  experience: string;
  location: string;
}

export default function JobSeekerDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<SearchParams>({ searchTerm: '', experience: '', location: '' });

  const handleSearch = (params: SearchParams) => {
    console.log("JobSeekerDashboardPage: New search params received:", params);
    setSearchParams(params);
  };

  useEffect(() => {
    if (!loading && user && user.role !== 'job-seeker') {
      // If user is not a job seeker, redirect them appropriately
      // This could be to /dashboard or /login if role is mismatched
      router.replace('/dashboard'); 
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'job-seeker') {
    // Render nothing or a message if role is incorrect, layout should handle main auth redirect
    return <div className="flex flex-1 items-center justify-center py-10"><p>Access denied or incorrect role.</p></div>;
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find Your Next Opportunity</h1>
        <p className="text-muted-foreground">Search for jobs that match your skills and interests.</p>
      </div>
      <JobSearchBar onSearch={handleSearch} />
      {/* Only show recommended jobs if there's no active search term */}
      {!searchParams.searchTerm && <RecommendedJobListings />}
      <JobListings searchParams={searchParams} /> {/* Pass searchParams to JobListings */}
    </div>
  );
}
