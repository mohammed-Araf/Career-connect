'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getJobSeekerProfile, JobSeekerProfile, EducationEntry } from '@/lib/api'; // Import EducationEntry
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'; // For Edit button later

export default function MyProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      getJobSeekerProfile(user.id)
        .then((data) => {
          setProfile(data);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to fetch profile:", err);
          setError(err.message || "Could not load profile.");
          setProfile(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
      // setError("Not logged in or user ID not available."); // Or redirect
    }
  }, [user]);

  if (loading) {
    return <div className="p-4">Loading profile...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!profile) {
    return (
      <div className="p-4">
        No profile data found. 
        <Button onClick={() => router.push('/dashboard/job-seeker/profile-setup')} className="ml-2">
          Complete Profile
        </Button>
      </div>
    );
  }

  // Helper to display education entries
  const renderEducation = () => {
    if (!profile.education || profile.education.length === 0) {
      return <p>No education details provided.</p>;
    }
    return profile.education.map((edu: EducationEntry, index: number) => (
      <div key={index} className="mb-2 p-2 border rounded">
        <p><strong>Level:</strong> {edu.level}</p>
        <p><strong>Institution:</strong> {edu.institutionName} ({edu.institutionAddress})</p>
        {edu.course && <p><strong>Course:</strong> {edu.course}</p>}
        <p><strong>Years:</strong> {edu.joinYear} - {edu.isStudying && index === profile.education!.length -1 ? 'Present' : edu.passOutYear || 'N/A'}</p>
        {edu.isDiploma && <p>(Diploma)</p>}
      </div>
    ));
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">{profile.fullName || 'Your Profile'}</CardTitle>
          {profile.headline && <CardDescription className="text-lg">{profile.headline}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio && (
            <div>
              <h3 className="font-semibold text-xl mb-1">Bio</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
          
          <div>
            <h3 className="font-semibold text-xl mb-1">Contact Information</h3>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            {profile.contactNumber && <p><strong>Phone:</strong> {profile.contactNumber}</p>}
            {profile.address && <p><strong>Address:</strong> {profile.address}</p>}
          </div>

          {profile.skills && (
            <div>
              <h3 className="font-semibold text-xl mb-1">Skills</h3>
              <p className="text-gray-700">{profile.skills}</p>
            </div>
          )}

          {(profile.experience || profile.yearsOfExperience) && (
            <div>
              <h3 className="font-semibold text-xl mb-1">Experience</h3>
              {profile.yearsOfExperience && <p><strong>Years of Experience:</strong> {profile.yearsOfExperience}</p>}
              {profile.experience && <p className="text-gray-700 whitespace-pre-wrap">{profile.experience}</p>}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-xl mb-1">Education</h3>
            {renderEducation()}
          </div>

          {(profile.resumeUrl || profile.portfolioUrl || profile.linkedinProfileUrl) && (
             <div>
              <h3 className="font-semibold text-xl mb-1">Links</h3>
              {profile.resumeUrl && <p><strong>Resume:</strong> <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.resumeUrl}</a></p>}
              {profile.portfolioUrl && <p><strong>Portfolio:</strong> <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.portfolioUrl}</a></p>}
              {profile.linkedinProfileUrl && <p><strong>LinkedIn:</strong> <a href={profile.linkedinProfileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.linkedinProfileUrl}</a></p>}
            </div>
          )}
          
          <div className="mt-6 flex space-x-2">
            <Button onClick={() => router.push('/dashboard/job-seeker/profile-setup')}>Edit Profile</Button>
            {/* Delete Profile button removed for simplification for now */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
