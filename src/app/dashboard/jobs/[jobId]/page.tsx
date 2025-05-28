"use client";

import { useEffect, useState, FormEvent } from 'react'; // Added FormEvent
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import type { Job, CustomFormField } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext'; // For user role and ID
import { useToast } from '@/hooks/use-toast'; // For notifications
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // For modal
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select imports
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import { MapPin, Briefcase, CalendarDays, ExternalLink, Building, DollarSign, Brain, Info, Loader2 } from 'lucide-react'; // Added Loader2
import { format } from 'date-fns'; // Using format for a more standard date display

async function getJobDetails(jobId: string): Promise<Job | null> {
  try {
    const response = await fetch(`/api/jobs/${jobId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Job with ID ${jobId} not found.`);
        return null;
      }
      throw new Error(`Failed to fetch job: ${response.statusText}`);
    }
    const jobData: Job = await response.json();
    return jobData;
  } catch (error) {
    console.error(`Error fetching job details for ID ${jobId}:`, error);
    throw error; // Re-throw to be caught by the component's error handling
  }
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter(); // For potential navigation after apply
  const jobId = params.jobId as string;
  const { user } = useAuth(); // Get current user
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  
  // State for application form fields
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState(""); // For simplicity, just a URL input
  const [notes, setNotes] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      if (typeof window !== 'undefined') {
        console.log(`JobDetailsPage - useEffect: Attempting to fetch job ID ${jobId}`);
      }
      getJobDetails(jobId)
        .then(data => {
          if (typeof window !== 'undefined') {
            console.log(`JobDetailsPage - useEffect: .then() entered. Data is null/undefined? ${data === null || data === undefined}`);
          }
          if (data) {
            setJob(data);
            // Initialize customAnswers state based on fetched questions
            const initialAnswers: Record<string, string> = {};
            data.customQuestions?.forEach(q => {
              if (q.id) initialAnswers[q.id] = ""; // Use question ID as key
            });
            setCustomAnswers(initialAnswers);
          } else {
            setError("Job not found.");
            if (typeof window !== 'undefined') {
              console.log(`JobDetailsPage - useEffect: Job ID ${jobId} not found (data was null/undefined).`);
            }
          }
        })
        .catch(err => {
          if (typeof window !== 'undefined') {
            console.error("JobDetailsPage - useEffect: Error in getJobDetails promise chain:", err);
          }
          setError("Failed to load job details. Please try again later.");
        })
        .finally(() => {
          if (typeof window !== 'undefined') {
            console.log(`JobDetailsPage - useEffect: .finally() block executed for job ID ${jobId}.`);
          }
          setLoading(false);
        });
    }
  }, [jobId]);

  const handleCustomAnswerChange = (questionId: string, value: string) => {
    setCustomAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitApplication = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !job) return;

    console.log("Submitting application for user:", user?.id, "with role:", user?.role); // DEBUG

    // Basic validation for custom required questions
    for (const q of job.customQuestions || []) {
      if (q.isRequired && q.id && !customAnswers[q.id]?.trim()) {
        toast({ title: "Missing Information", description: `Please answer the required question: "${q.label}"`, variant: "destructive" });
        return;
      }
    }

    setApplicationSubmitting(true);
    const payload = {
      jobListingId: parseInt(job.id, 10), 
      seekerFirebaseUID: user.id, // user.id from AuthContext is the firebaseUID
      coverLetterText: coverLetter,
      resumeSnapshotUrl: resumeUrl,
      notesForProvider: notes,
      customAnswers: customAnswers,
    };

    if (typeof window !== 'undefined') {
      console.log("JobDetailsPage - handleSubmitApplication - Payload being sent:", JSON.stringify(payload));
    }

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Error: ${response.status}`);
      }

      toast({ title: "Application Submitted!", description: "Your application has been sent successfully." });
      setIsApplyModalOpen(false);
      // Optionally, disable apply button or redirect
    } catch (err) {
      console.error("Failed to submit application:", err);
      toast({ title: "Application Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setApplicationSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading job details...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
  }

  if (!job) {
    return <div className="container mx-auto p-4 text-center">Job details not available.</div>;
  }

  let formattedPostedDate = job.postedDate;
  try {
    formattedPostedDate = format(new Date(job.postedDate), 'MMMM d, yyyy');
  } catch (e) {
    // console.error("Error formatting date for job details:", e);
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="border-b pb-6">
          <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {job.companyLogoUrl && (
              <Image
                src={job.companyLogoUrl}
                alt={`${job.company} logo`}
                width={100}
                height={100}
                className="rounded-lg border object-contain h-20 w-20 sm:h-24 sm:w-24"
              />
            )}
            <div className="flex-grow">
              <CardTitle className="text-2xl md:text-3xl font-bold mb-1">{job.title}</CardTitle>
              <div className="flex items-center text-lg text-muted-foreground mb-1">
                <Building className="mr-2 h-5 w-5 text-primary" />
                {job.company}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4 text-primary" />
                {job.location || 'Not specified'}
              </div>
            </div>
            {/* Conditional Apply Button Logic */}
            {user?.role === 'job-seeker' ? (
              job.applyUrl ? (
                <Button asChild className="w-full mt-4 sm:w-auto sm:mt-0">
                  <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                    Apply Externally <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button onClick={() => setIsApplyModalOpen(true)} className="w-full mt-4 sm:w-auto sm:mt-0">
                  Apply via Platform
                </Button>
              )
            ) : job.applyUrl ? ( // Non-seeker (guest/provider) viewing a job with an external link
              <Button asChild className="w-full mt-4 sm:w-auto sm:mt-0">
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                  View Application Page <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="py-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Info className="mr-2 h-5 w-5 text-primary" />
              Job Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                <strong>Type:</strong>&nbsp;{job.type || 'Not specified'}
              </div>
              <div className="flex items-center">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                <strong>Posted:</strong>&nbsp;{formattedPostedDate}
              </div>
              {job.experienceLevel && (
                <div className="flex items-center">
                  <Brain className="mr-2 h-4 w-4 text-muted-foreground" />
                  <strong>Experience:</strong>&nbsp;{job.experienceLevel}
                </div>
              )}
              {job.salary && (
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  <strong>Salary:</strong>&nbsp;{job.salary}
                </div>
              )}
            </div>
          </div>

          {job.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Job Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {job.description}
              </p>
            </div>
          )}

          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">{skill}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        {/* Footer button logic adjusted: only show if internal application is possible and user is seeker */}
        {user?.role === 'job-seeker' && !job.applyUrl && (
           <CardFooter className="border-t pt-6 flex justify-end">
                <Button onClick={() => setIsApplyModalOpen(true)} className="w-full sm:w-auto">
                  Apply via Platform
                </Button>
           </CardFooter>
        )}
         {/* Or, if external link exists and user is seeker, it's already in the header.
             If user is not seeker and external link exists, it's also in header.
             So, footer might not need an apply button if header handles all cases.
             For simplicity, let's assume the header button is sufficient.
             The original CardFooter logic for applyUrl was a bit redundant with the header one.
         */}
      </Card>

      {/* Application Modal - only show if !job.applyUrl for seekers */}
      {job && !job.applyUrl && isApplyModalOpen && user?.role === 'job-seeker' && (
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Apply for: {job.title}</DialogTitle>
              <DialogDescription>
                Submit your application for {job.title} at {job.company}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitApplication} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                <Textarea id="coverLetter" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Write a brief cover letter..." />
              </div>
              <div>
                <Label htmlFor="resumeUrl">Resume URL (Optional)</Label>
                <Input id="resumeUrl" type="url" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://example.com/your-resume.pdf" />
                <p className="text-xs text-muted-foreground mt-1">Link to your resume (e.g., Google Drive, Dropbox, personal site).</p>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes for the hiring manager..." />
              </div>

              {job.customQuestions && job.customQuestions.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Application Questions:</h4>
                  {/* Previous diagnostic log location removed, new one is in useEffect */}
                  {job.customQuestions.map((q) => (
                    q.id && ( // Ensure question has an ID to use as key for answers
                      <div key={q.id} className="space-y-1">
                        <Label htmlFor={`custom_q_${q.id}`}>
                          {q.label}
                          {q.isRequired && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {q.type === 'text' && <Input id={`custom_q_${q.id}`} value={customAnswers[q.id] || ""} onChange={(e) => handleCustomAnswerChange(q.id!, e.target.value)} required={q.isRequired} />}
                        {q.type === 'textarea' && <Textarea id={`custom_q_${q.id}`} value={customAnswers[q.id] || ""} onChange={(e) => handleCustomAnswerChange(q.id!, e.target.value)} required={q.isRequired} />}
                        {q.type === 'select' && q.options && (
                          <Select value={customAnswers[q.id!] || ""} onValueChange={(val: string) => handleCustomAnswerChange(q.id!, val)} >
                            <SelectTrigger className={q.isRequired && !customAnswers[q.id!] ? "border-red-500" : ""}><SelectValue placeholder="Select an option" /></SelectTrigger>
                            <SelectContent>
                              {q.options.split(',').map(opt => opt.trim()).map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {q.type === 'radio' && q.options && (
                          <div className="space-y-1">
                            {q.options.split(',').map(opt => opt.trim()).map((option, optIndex) => (
                              <div key={option} className="flex items-center space-x-2">
                                <input type="radio" id={`custom_q_${q.id!}_${optIndex}`} name={`custom_q_${q.id!}`} value={option} checked={customAnswers[q.id!] === option} onChange={(e) => handleCustomAnswerChange(q.id!, e.target.value)} />
                                <Label htmlFor={`custom_q_${q.id!}_${optIndex}`}>{option}</Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={applicationSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={applicationSubmitting}>
                  {applicationSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Application"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
