
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Briefcase, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function JobProviderDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'job-provider') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'job-provider') {
    return <div className="flex flex-1 items-center justify-center py-10"><p>Access denied or incorrect role.</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employer Dashboard</h1>
        <p className="text-muted-foreground">Manage your job postings and find the best talent.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Post a New Job</CardTitle>
            <Briefcase className="h-6 w-6 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Create and publish new job opportunities to attract candidates.</p>
            <Button className="w-full" asChild>
              <Link href="/dashboard/job-provider/post-job">
                <PlusCircle className="mr-2 h-4 w-4" /> Post Job
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Manage Listings</CardTitle>
            <FileText className="h-6 w-6 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">View, edit, or remove your active job postings.</p>
             <Button variant="outline" className="w-full" asChild>
               <Link href="/dashboard/job-provider/my-listings">View My Listings</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Applicant Tracking</CardTitle>
             <Users className="h-6 w-6 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Review and manage applications for your job posts.</p>
             <Button variant="outline" className="w-full" asChild>
               <Link href="/dashboard/job-provider/applicants">View Applicants</Link>
              </Button>
          </CardContent>
        </Card>
      </div>
      {/* Overview card removed for simplification */}
    </div>
  );
}
