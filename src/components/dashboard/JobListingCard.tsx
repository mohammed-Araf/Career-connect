"use client";
import type { Job } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Briefcase, CalendarDays, ExternalLink, Edit, Trash2 } from 'lucide-react'; // Added Edit, Trash2
import { formatDistanceToNow } from 'date-fns';

interface JobListingCardProps {
  job: Job;
  showAdminActions?: boolean; // New prop
  onDeleteJob?: (jobId: string) => void; // New prop
  // onEditJob?: (jobId: string) => void; // For future edit functionality
}

export function JobListingCard({ job, showAdminActions = false, onDeleteJob }: JobListingCardProps) {
  let postedDateRelative = '';
  try {
    postedDateRelative = formatDistanceToNow(new Date(job.postedDate), { addSuffix: true });
  } catch (error) {
    // console.error("Error formatting date:", error);
    postedDateRelative = job.postedDate; // Fallback to raw date string
  }


  return (
    <Card className="hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-4">
          {job.companyLogoUrl && (
            <Image 
              src={job.companyLogoUrl} 
              alt={`${job.company} logo`} 
              width={64} 
              height={64} 
              className="rounded-md border object-contain h-16 w-16"
              // data-ai-hint={job.dataAiHint || "company logo"} // Removed as dataAiHint is not in Job type
            />
          )}
          <div className="flex-grow">
            <CardTitle className="text-xl mb-1">{job.title}</CardTitle>
            <CardDescription className="text-base text-foreground">{job.company}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow pb-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4 text-primary" />
          {job.location}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Briefcase className="mr-2 h-4 w-4 text-primary" />
          {job.type}
        </div>
         <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4 text-primary" />
          Posted {postedDateRelative}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 pt-1">
          {job.shortDescription}
        </p>
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {job.skills.slice(0, 3).map(skill => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Link href={`/dashboard/jobs/${job.id}`} passHref>
            <Button variant="outline" className="w-full sm:w-auto">
              View Details
            </Button>
          </Link>
          {job.applyUrl && !showAdminActions && ( // Only show Apply if not admin view or no apply URL
            <Button className="w-full sm:w-auto" asChild>
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                Apply Now <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
        {showAdminActions && (
          <div className="flex gap-2">
            <Link href={`/dashboard/job-provider/edit-job/${job.id}`} passHref>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full sm:w-auto"
              onClick={() => onDeleteJob && onDeleteJob(job.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
