'use client';

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { saveJobSeekerProfile, getJobSeekerProfile, JobSeekerProfile } from '@/lib/api'; // Import API functions and type
// import { doc, setDoc, getDoc } from 'firebase/firestore'; // Removed Firebase imports
// import { db } from '@/lib/firebase'; // Removed Firebase imports

interface EducationEntry { // Moved interface to top level for potential reuse
  level: 'SSLC / 10th' | 'Pre-University / Diploma' | 'Undergraduate (Bachelor’s Degree)' | 'Graduate (Master’s Degree)' | 'Postgraduate (M.Phil / Ph.D)';
  institutionName: string;
  institutionAddress: string;
  course?: string;
  joinYear: string;
  passOutYear?: string;
  isDiploma?: boolean; // Added for Pre-University / Diploma distinction
  isStudying?: boolean; // Added to match API type
}

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [educationLevel, setEducationLevel] = useState('highschool'); // Default highest level achieved
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [isGloballyStudying, setIsGloballyStudying] = useState(false); // For the highest education entry
  
  const [loading, setLoading] = useState(true); // Start true to cover profile loading
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false); // To track if profile data has been loaded

  const router = useRouter();
  const { user, loading: authLoading, updateProfileCompletion } = useAuth();


  // Fetch existing profile data
  useEffect(() => {
    if (user && !authLoading && !profileLoaded) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const profile = await getJobSeekerProfile(user.id);
          if (profile) {
            setFullName(profile.fullName || '');
            setHeadline(profile.headline || '');
            setBio(profile.bio || '');
            setResumeUrl(profile.resumeUrl || '');
            setPortfolioUrl(profile.portfolioUrl || '');
            setLinkedinProfileUrl(profile.linkedinProfileUrl || '');
            setContactNumber(profile.contactNumber || '');
            setAddress(profile.address || '');
            setSkills(profile.skills || '');
            setExperience(profile.experience || '');
            setYearsOfExperience(profile.yearsOfExperience || '');

            if (profile.education && profile.education.length > 0) {
              // Determine the highest education level from the entries
              const highestEdu = profile.education[profile.education.length - 1];
              if (highestEdu) {
                // Map DB level to form's educationLevel state value
                if (highestEdu.level === 'SSLC / 10th') setEducationLevel('highschool');
                else if (highestEdu.level === 'Pre-University / Diploma') setEducationLevel('12/diploma');
                else if (highestEdu.level === 'Undergraduate (Bachelor’s Degree)') setEducationLevel('undergraduated');
                else if (highestEdu.level === 'Graduate (Master’s Degree)') setEducationLevel('graduated');
                else if (highestEdu.level === 'Postgraduate (M.Phil / Ph.D)') setEducationLevel('post graduated');
                
                setIsGloballyStudying(!!highestEdu.isStudying);
              }
              setEducationEntries(profile.education as EducationEntry[]); // Cast needed if types slightly differ
            } else {
              // No education entries from DB, set a default empty one based on initial educationLevel
              setEducationEntries([{
                level: 'SSLC / 10th', institutionName: '', institutionAddress: '', joinYear: '', passOutYear: ''
              }]);
            }
          } else {
            // No profile found, initialize with one default empty SSLC entry
             setEducationEntries([{
                level: 'SSLC / 10th', institutionName: '', institutionAddress: '', joinYear: '', passOutYear: ''
              }]);
          }
          setProfileLoaded(true);
        } catch (err: any) {
          console.error("Failed to fetch profile:", err);
          setError("Failed to load your profile. Please try again.");
           // Fallback to one default empty SSLC entry on error
            setEducationEntries([{
              level: 'SSLC / 10th', institutionName: '', institutionAddress: '', joinYear: '', passOutYear: ''
            }]);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else if (!authLoading && !user) {
        // No user logged in, stop loading
        setLoading(false);
        router.replace('/login'); // Redirect if no user
    }
  }, [user, authLoading, router, profileLoaded]);


  // This useEffect now primarily manages adding/removing education entry fields
  // based on `educationLevel` IF a profile hasn't been loaded with specific entries.
  // Or if the user changes the `educationLevel` after the profile has loaded.
  const generateEducationStructure = useCallback(() => {
    const currentEntriesCount = educationEntries.length;
    let targetEntries: EducationEntry[] = [];

    const createEmptyEntry = (level: EducationEntry['level']): EducationEntry => ({
      level, institutionName: '', institutionAddress: '', joinYear: '', passOutYear: '', course: '', isDiploma: false
    });

    if (educationLevel === 'highschool') {
      targetEntries = [createEmptyEntry('SSLC / 10th')];
    } else if (educationLevel === '12/diploma') {
      targetEntries = [
        createEmptyEntry('SSLC / 10th'),
        createEmptyEntry('Pre-University / Diploma'),
      ];
    } else if (educationLevel === 'undergraduated') {
      targetEntries = [
        createEmptyEntry('SSLC / 10th'),
        createEmptyEntry('Pre-University / Diploma'),
        createEmptyEntry('Undergraduate (Bachelor’s Degree)'),
      ];
    } else if (educationLevel === 'graduated') {
      targetEntries = [
        createEmptyEntry('SSLC / 10th'),
        createEmptyEntry('Pre-University / Diploma'),
        createEmptyEntry('Undergraduate (Bachelor’s Degree)'),
        createEmptyEntry('Graduate (Master’s Degree)'),
      ];
    } else if (educationLevel === 'post graduated') {
      targetEntries = [
        createEmptyEntry('SSLC / 10th'),
        createEmptyEntry('Pre-University / Diploma'),
        createEmptyEntry('Undergraduate (Bachelor’s Degree)'),
        createEmptyEntry('Graduate (Master’s Degree)'),
        createEmptyEntry('Postgraduate (M.Phil / Ph.D)'),
      ];
    }
    
    // Preserve existing data if possible, otherwise use new structure
    const newEducationEntries = targetEntries.map((targetEntry, index) => {
        if (educationEntries[index] && educationEntries[index].level === targetEntry.level) {
            return educationEntries[index]; // Keep existing data if level matches
        }
        return targetEntry; // Otherwise, use the new empty structure for this level
    });

    setEducationEntries(newEducationEntries);

  }, [educationLevel, educationEntries]); // educationEntries added to dependencies

  useEffect(() => {
    // Only run this if profile has been loaded, to allow user changes to educationLevel
    // or if it's a new profile without saved education entries.
    if (profileLoaded) {
        generateEducationStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [educationLevel, profileLoaded]); // generateEducationStructure is memoized with useCallback

  // Removed duplicate interface EducationEntry declaration here

  const handleEducationChange = (index: number, field: keyof EducationEntry, value: any) => {
    const updatedEntries = [...educationEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setEducationEntries(updatedEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called'); // Debug log
    setError('');
    setLoading(true);

    if (!user) {
      setError('No user logged in.');
      setLoading(false);
      return;
    }

    try {
      // Prepare education data for saving
      const educationDataToSave = educationEntries.map((entry, index) => {
        const isLastEntry = index === educationEntries.length - 1;
        const newEntry: EducationEntry = { ...entry };

        // Handle isStudying for the last entry
        if (isLastEntry) {
          (newEntry as any).isStudying = isGloballyStudying; // Cast to any to add new property
        } else {
          delete (newEntry as any).isStudying; // Ensure it's not present for other entries
        }

        // Handle passOutYear for the last entry if globally studying
        if (isLastEntry && isGloballyStudying) {
          delete newEntry.passOutYear;
        }

        // Ensure course is only present if level is not SSLC / 10th
        if (newEntry.level === 'SSLC / 10th') {
          delete newEntry.course;
        }

        // Ensure isDiploma is only present if level is Pre-University / Diploma
        if (newEntry.level !== 'Pre-University / Diploma') {
          delete (newEntry as any).isDiploma;
        }

        return newEntry;
      });

      await saveJobSeekerProfile({
        id: user.id, // This is the firebase_uid
        email: user.email, // Pass email for new user creation in API if needed
        fullName,
        headline,
        bio,
        resumeUrl,
        portfolioUrl,
        linkedinProfileUrl,
        contactNumber,
        address,
        skills,
        experience,
        yearsOfExperience,
        education: educationDataToSave,
        profileCompleted: true,
      });
      updateProfileCompletion(true); // Update context to reflect profile completion
      router.push('/dashboard/job-seeker'); // Redirect to job seeker dashboard after profile setup
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCoursePlaceholder = (entry: EducationEntry) => {
    if (entry.level === 'Pre-University / Diploma') {
      return entry.isDiploma ? 'Example: Computer Science, Mechanical, Civil, Electrical' : 'Example: Science, Commerce, Arts';
    } else if (entry.level === 'Undergraduate (Bachelor’s Degree)') {
      return 'Example: B.A., B.Sc., B.Com., B.E., B.Tech, BBA';
    } else if (entry.level === 'Graduate (Master’s Degree)') {
      return 'Example: M.A., M.Sc., M.Com., M.E., M.Tech, MBA';
    } else if (entry.level === 'Postgraduate (M.Phil / Ph.D)') {
      return 'Example: M.Phil in Physics, Ph.D in Computer Science';
    }
    return 'e.g., Science, Commerce, B.Tech'; // Default for other levels
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your information to set up your job seeker profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* New Fields */}
            <div className="grid gap-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                type="text"
                placeholder="e.g., Passionate Software Developer"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio / Summary</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resumeUrl">Resume URL</Label>
              <Input
                id="resumeUrl"
                type="url"
                placeholder="https://example.com/your-resume.pdf"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portfolioUrl">Portfolio URL</Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder="https://example.com/your-portfolio"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedinProfileUrl">LinkedIn Profile URL</Label>
              <Input
                id="linkedinProfileUrl"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinProfileUrl}
                onChange={(e) => setLinkedinProfileUrl(e.target.value)}
              />
            </div>
            {/* End New Fields */}

            <div className="grid gap-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="123-456-7890"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, Anytown, USA"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">Skills</Label>
              <Textarea
                id="skills"
                placeholder="List your skills, e.g., JavaScript, React, Node.js"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                required
              />
            </div>
            {/* Experience Section */}
            <div className="grid grid-cols-2 gap-2 items-end">
              <div className="grid gap-2">
                <Label htmlFor="experience">Experience Description</Label>
                <Textarea
                  id="experience"
                  placeholder="Describe your work experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                <Select onValueChange={setYearsOfExperience} value={yearsOfExperience}>
                  <SelectTrigger id="yearsOfExperience">
                    <SelectValue placeholder="Select years" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i === 0 ? '0 Years' : i === 30 ? '30+ Years' : `${i} Years`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Education Section */}
            <div className="grid grid-cols-2 gap-2 items-end"> {/* Use grid for side-by-side */}
              <div className="grid gap-2">
                <Label htmlFor="educationLevel">Educated Till</Label>
                <Select onValueChange={setEducationLevel} value={educationLevel}>
                  <SelectTrigger id="educationLevel">
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highschool">SSLC / 10th</SelectItem>
                    <SelectItem value="12/diploma">Pre-University / Diploma</SelectItem>
                    <SelectItem value="undergraduated">Undergraduate (Bachelor’s Degree)</SelectItem>
                    <SelectItem value="graduated">Graduate (Master’s Degree)</SelectItem>
                    <SelectItem value="post graduated">Postgraduate (M.Phil / Ph.D)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {educationLevel !== 'highschool' && ( // Only show "Currently Studying" if not high school
                <div className="flex items-center space-x-2 mb-2"> {/* Added mb-2 for alignment */}
                  <Checkbox
                    id="isGloballyStudying"
                    checked={isGloballyStudying}
                    onCheckedChange={(checked) => setIsGloballyStudying(checked as boolean)}
                  />
                  <Label htmlFor="isGloballyStudying">Currently Studying</Label>
                </div>
              )}
            </div>

            {educationEntries.map((entry, index) => (
              <Card key={index} className="mt-4 p-4">
                <CardTitle className="text-lg mb-4">{entry.level}</CardTitle>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`institutionName-${index}`}>Institution Name</Label>
                    <Input
                      id={`institutionName-${index}`}
                      type="text"
                      placeholder="e.g., ABC School/University"
                      value={entry.institutionName}
                      onChange={(e) => handleEducationChange(index, 'institutionName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`institutionAddress-${index}`}>Institution Address</Label>
                    <Input
                      id={`institutionAddress-${index}`}
                      type="text"
                      placeholder="e.g., City, State, Country"
                      value={entry.institutionAddress}
                      onChange={(e) => handleEducationChange(index, 'institutionAddress', e.target.value)}
                      required
                    />
                  </div>
                  {entry.level !== 'SSLC / 10th' && (
                    <>
                      {entry.level === 'Pre-University / Diploma' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`isDiploma-${index}`}
                            checked={entry.isDiploma}
                            onCheckedChange={(checked) => handleEducationChange(index, 'isDiploma', checked as boolean)}
                          />
                          <Label htmlFor={`isDiploma-${index}`}>This is a Diploma</Label>
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor={`course-${index}`}>Course</Label>
                        <Input
                          id={`course-${index}`}
                          type="text"
                          placeholder={getCoursePlaceholder(entry)}
                          value={entry.course || ''}
                          onChange={(e) => handleEducationChange(index, 'course', e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor={`joinYear-${index}`}>Join Year</Label>
                    <Input
                      id={`joinYear-${index}`}
                      type="number"
                      placeholder="e.g., 2018"
                      value={entry.joinYear}
                      onChange={(e) => handleEducationChange(index, 'joinYear', e.target.value)}
                      required
                    />
                  </div>
                  {!(isGloballyStudying && index === educationEntries.length - 1) && (
                    <div className="grid gap-2">
                      <Label htmlFor={`passOutYear-${index}`}>Pass Out Year</Label>
                      <Input
                        id={`passOutYear-${index}`}
                        type="number"
                        placeholder="e.g., 2020"
                        value={entry.passOutYear || ''}
                        onChange={(e) => handleEducationChange(index, 'passOutYear', e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
