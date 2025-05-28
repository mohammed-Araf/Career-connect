"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardRootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'job-seeker') {
        router.replace('/dashboard/job-seeker');
      } else if (user.role === 'job-provider') {
        router.replace('/dashboard/job-provider');
      }
    } else if (!loading && !user) {
        router.replace('/login'); // Should be handled by layout, but good fallback
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) return null; 

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to CareerConnect</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Loading your personalized dashboard...</p>
        {user.role ? (
          <p>Redirecting to your {user.role} dashboard.</p>
        ) : (
          <p>User role not set. Please contact support or update your profile.</p>
        )}
      </CardContent>
    </Card>
  );
}
