"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2, PlusCircle, Trash2, AlertTriangle } from "lucide-react";
import type { Job, CustomFormField as CustomFormFieldTypeFromTypes } from "@/types"; 
import { Separator } from "@/components/ui/separator";

const experienceLevels = ['Entry-level', 'Mid-level', 'Senior-level', 'Lead', 'Manager', 'Executive'] as const;
const jobTypes = ["Full-time", "Part-time", "Contract", "Internship", "Temporary", "Freelance"] as const;
const customQuestionTypes = ["text", "textarea", "select", "radio"] as const;

const customQuestionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Question label cannot be empty."),
  type: z.enum(customQuestionTypes, { required_error: "You need to select a question type." }),
  options: z.string().optional().describe("Comma-separated options for select/radio types."),
  isRequired: z.boolean().default(false),
});

const editJobFormSchema = z.object({
  title: z.string().min(3, "Job title must be at least 3 characters."),
  companyNameOverride: z.string().min(2, "Company name must be at least 2 characters."),
  location: z.string().min(2, "Location is required."),
  jobType: z.enum(jobTypes).optional(),
  experienceLevel: z.enum(experienceLevels).optional(),
  salary: z.string().optional(),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters.").max(200, "Short description must be less than 200 characters.").optional(),
  description: z.string().min(50, "Full description must be at least 50 characters."),
  skills: z.string().optional().describe("Comma-separated list of skills"),
  applyUrl: z.string().url("Please enter a valid URL to apply.").optional().or(z.literal("")),
  customQuestions: z.array(customQuestionSchema).optional(),
});

type EditJobFormValues = z.infer<typeof editJobFormSchema>;

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingJob, setIsFetchingJob] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const form = useForm<EditJobFormValues>({
    resolver: zodResolver(editJobFormSchema),
    defaultValues: { 
      title: "",
      companyNameOverride: "",
      location: "",
      jobType: undefined,
      experienceLevel: undefined,
      salary: "",
      shortDescription: "",
      description: "",
      skills: "",
      applyUrl: "",
      customQuestions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customQuestions",
  });

  useEffect(() => {
    if (jobId) {
      setIsFetchingJob(true);
      fetch(`/api/jobs/${jobId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Failed to fetch job details" }));
            throw new Error(errorData.error || `Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data: Job) => { 
          form.reset({
            title: data.title,
            companyNameOverride: data.company, 
            location: data.location || "",
            jobType: data.type === null ? undefined : data.type,
            experienceLevel: data.experienceLevel === null ? undefined : data.experienceLevel,
            salary: data.salary || "",
            shortDescription: data.shortDescription || "",
            description: data.description,
            skills: data.skills?.join(', ') || "",
            applyUrl: data.applyUrl || "",
            customQuestions: data.customQuestions || [], // Populate custom questions
          });
          setFetchError(null);
        })
        .catch(err => {
          console.error("Failed to fetch job details for editing:", err);
          setFetchError((err as Error).message || "Could not load job details.");
        })
        .finally(() => setIsFetchingJob(false));
    }
  }, [jobId, form]);

  async function onSubmit(values: EditJobFormValues) {
    if (!user || !user.id) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!jobId) {
      toast({ title: "Error", description: "Job ID is missing.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const payload = {
      title: values.title,
      companyNameOverride: values.companyNameOverride,
      location: values.location,
      jobType: values.jobType,
      experienceLevel: values.experienceLevel,
      description: values.description,
      shortDescription: values.shortDescription, 
      requiredSkills: values.skills,
      howToApply: values.applyUrl,
      customQuestions: values.customQuestions, // Send custom questions to PUT API
    };

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'X-User-Firebase-UID': user.id, 
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Failed to update job. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) errorMsg = errorData.error;
          else if (errorData && errorData.message) errorMsg = errorData.message;
        } catch (jsonError) { console.error("Failed to parse JSON error response:", jsonError); }
        throw new Error(errorMsg);
      }

      toast({
        title: "Job Updated Successfully!",
        description: `${values.title} has been updated.`,
      });
      router.push("/dashboard/job-provider/my-listings");
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error Updating Job",
        description: (error instanceof Error) ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetchingJob) {
    return <div className="flex flex-1 items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (fetchError) {
    return (
      <div className="space-y-6 text-center">
         <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="text-xl text-destructive">Error loading job details: {fetchError}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/job-provider/my-listings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Listings
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild>
        <Link href="/dashboard/job-provider/my-listings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Listings
        </Link>
      </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Job Listing</CardTitle>
          <CardDescription>
            Update the details for your job posting: {form.getValues("title") || "..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Core Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g., Senior Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="companyNameOverride" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g., Innovatech Solutions" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., San Francisco, CA or Remote" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="jobType" render={({ field }) => (<FormItem><FormLabel>Job Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select job type" /></SelectTrigger></FormControl><SelectContent>{jobTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="experienceLevel" render={({ field }) => (<FormItem><FormLabel>Experience Level</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select experience level" /></SelectTrigger></FormControl><SelectContent>{experienceLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salary Range (Optional)</FormLabel><FormControl><Input placeholder="e.g., ₹8,00,000 - ₹12,00,000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="skills" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Skills (comma-separated)</FormLabel><FormControl><Input placeholder="e.g., React, Node.js, Python" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>

              {/* Full-width fields */}
              <FormField control={form.control} name="shortDescription" render={({ field }) => (<FormItem><FormLabel>Short Description (Max 200 chars)</FormLabel><FormControl><Textarea placeholder="Briefly describe the role..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Full Job Description</FormLabel><FormControl><Textarea placeholder="Provide a detailed description..." className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="applyUrl" render={({ field }) => (<FormItem><FormLabel>Application URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/apply-here" {...field} /></FormControl><FormMessage /></FormItem>)} />
              
              {/* Custom Application Questions Section */}
              <div className="space-y-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Custom Application Questions</h3>
                    <p className="text-sm text-muted-foreground">Add or modify specific questions for applicants.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ label: "", type: "text", options: "", isRequired: false })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                  </Button>
                </div>
                {fields.map((item, index) => (
                  <Card key={item.id} className="p-4 space-y-4 shadow-md">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm">Question {index + 1}</p>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" /> <span className="sr-only">Remove question</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`customQuestions.${index}.label`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Question Label</FormLabel><FormControl><Input placeholder="e.g., What are your salary expectations?" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name={`customQuestions.${index}.type`} render={({ field: selectField }) => (<FormItem><FormLabel>Question Type</FormLabel><Select onValueChange={selectField.onChange} value={selectField.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Select question type" /></SelectTrigger></FormControl><SelectContent>{customQuestionTypes.map(type => (<SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <Controller control={form.control} name={`customQuestions.${index}.type`} render={({ field: { value: questionType } }) => ((questionType === 'select' || questionType === 'radio') ? (<FormField control={form.control} name={`customQuestions.${index}.options`} render={({ field }) => (<FormItem><FormLabel>Options (comma-separated)</FormLabel><FormControl><Textarea placeholder="e.g., Yes, No, Maybe" {...field} /></FormControl><FormMessage /></FormItem>)} />) : <></>)} />
                    </div>
                    <FormField control={form.control} name={`customQuestions.${index}.isRequired`} render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Required Question</FormLabel></div></FormItem>)} />
                    {index < fields.length - 1 && <Separator className="my-4"/>}
                  </Card>
                ))}
                {fields.length === 0 && (<p className="text-sm text-muted-foreground text-center py-4">No custom questions added.</p>)}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || isFetchingJob} className="min-w-[120px]">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Job"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
