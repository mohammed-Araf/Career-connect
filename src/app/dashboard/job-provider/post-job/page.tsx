
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Job, CustomFormField } from "@/types"; 
import { Separator } from "@/components/ui/separator";

// Experience levels to match the Job type and database schema
const experienceLevels = ['Entry-level', 'Mid-level', 'Senior-level', 'Lead', 'Manager', 'Executive'] as const;
const jobTypes = ["Full-time", "Part-time", "Contract", "Internship", "Temporary", "Freelance"] as const;
const customQuestionTypes = ["text", "textarea", "select", "radio"] as const;

const customQuestionSchema = z.object({
  label: z.string().min(1, "Question label cannot be empty."),
  type: z.enum(customQuestionTypes, {
    required_error: "You need to select a question type.",
  }),
  options: z.string().optional().describe("Comma-separated options for select/radio types."),
  isRequired: z.boolean().default(false),
});

const postJobFormSchema = z.object({
  title: z.string().min(3, "Job title must be at least 3 characters."),
  company: z.string().min(2, "Company name must be at least 2 characters."),
  location: z.string().min(2, "Location is required."),
  jobType: z.enum(jobTypes, {
    required_error: "You need to select a job type.",
  }),
  experienceLevel: z.enum(experienceLevels).optional(),
  salary: z.string().optional(),
  shortDescription: z // Re-adding shortDescription
    .string()
    .min(10, "Short description must be at least 10 characters.")
    .max(200, "Short description must be less than 200 characters."),
  description: z
    .string()
    .min(50, "Full description must be at least 50 characters."),
  skills: z
    .string()
    .optional(),
  applyUrl: z
    .string()
    .url("Please enter a valid URL to apply.")
    .optional()
    .or(z.literal("")),
  customQuestions: z.array(customQuestionSchema).optional(),
});

type PostJobFormValues = z.infer<typeof postJobFormSchema>;

export default function PostJobPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from AuthContext
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobFormSchema),
    defaultValues: {
      title: "",
      company: "",
      location: "",
      jobType: undefined,
      experienceLevel: undefined,
      salary: "",
      shortDescription: "", // Re-adding shortDescription
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

  async function onSubmit(values: PostJobFormValues) {
    if (!user || !user.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to post a job.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    // Map form values to the CreateJobPayload structure for the API
    const payload = {
      firebaseUID: user.id, // user.id from AuthContext is expected to be the firebaseUID
      title: values.title,
      companyNameOverride: values.company,
      location: values.location,
      jobType: values.jobType,
      experienceLevel: values.experienceLevel,
      shortDescription: values.shortDescription, // Add shortDescription to payload
      description: values.description,
      requiredSkills: values.skills,
      howToApply: values.applyUrl,
      customQuestions: values.customQuestions, // Add customQuestions to payload
    };

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Failed to post job. Status: ${response.status}`; // Default error with status
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMsg = errorData.message;
          } else if (errorData && errorData.error) { // Check for an 'error' property from API
            errorMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
          }
        } catch (jsonError) {
          // If .json() fails, the response was not JSON or was empty.
          // Use the default errorMsg which already includes status.
          console.error("Failed to parse JSON error response:", jsonError);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();

      toast({
        title: "Job Posted Successfully!",
        description: `${values.title} at ${values.company} has been submitted. Job ID: ${result.jobId}`,
      });
      form.reset();
      router.push("/dashboard/job-provider/my-listings"); // Redirect after successful post
    } catch (error) {
      console.error("Error posting job:", error);
      toast({
        title: "Error Posting Job",
        description: (error instanceof Error) ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild>
        <Link href="/dashboard/job-provider">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Post a New Job</CardTitle>
          <CardDescription>
            Fill in the details below to create a new job listing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Core Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Innovatech Solutions" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., San Francisco, CA or Remote" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jobTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary Range (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ₹8,00,000 - ₹12,00,000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., React, Node.js, Python" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter skills separated by commas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div> {/* This closes the md:grid-cols-2 div */}

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description (Max 200 chars)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly describe the role and its key responsibilities. This appears in job listings."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of the job, company culture, requirements, and benefits."
                        className="min-h-[150px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <h3 className="text-lg font-medium pt-4 border-t">Application Process</h3>
               <div className="grid grid-cols-1 md:grid-cols-1 gap-6"> {/* Changed to md:grid-cols-1 for applyUrl */}
                <FormField
                  control={form.control}
                  name="applyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application URL (Optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com/apply-here" {...field} />
                      </FormControl>
                      <FormDescription>
                        If you have an external application link (e.g., on your company website), provide it here. 
                        Otherwise, candidates will apply through this platform using the custom questions below (if any).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Company Logo URL and AI Hint fields fully removed */}

              {/* Custom Application Questions Section */}
              <div className="space-y-6 pt-6 border-t mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Custom Application Questions</h3>
                        <p className="text-sm text-muted-foreground">
                        Add specific questions for applicants to answer.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ label: "", type: "text", options: "", isRequired: false })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Question
                    </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 space-y-4 shadow-md">
                    <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">Question {index + 1}</p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove question</span>
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`customQuestions.${index}.label`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Question Label</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., What are your salary expectations?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`customQuestions.${index}.type`}
                        render={({ field: selectField }) => ( // Renamed field to avoid conflict
                          <FormItem>
                            <FormLabel>Question Type</FormLabel>
                            <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select question type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="text">Short Answer (Text)</SelectItem>
                                <SelectItem value="textarea">Paragraph (Textarea)</SelectItem>
                                <SelectItem value="select">Dropdown (Select)</SelectItem>
                                <SelectItem value="radio">Multiple Choice (Radio)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <Controller
                          control={form.control}
                          name={`customQuestions.${index}.type`}
                          render={({ field: { value: questionType } }) => (
                            (questionType === 'select' || questionType === 'radio') ? (
                              <FormField
                                control={form.control}
                                name={`customQuestions.${index}.options`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Options</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Comma-separated options, e.g., Yes, No, Maybe"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      For Dropdown or Multiple Choice types.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ) : <></> // Return empty fragment instead of null
                          )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name={`customQuestions.${index}.isRequired`}
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                            <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel>
                                Required Question
                            </FormLabel>
                            <FormDescription>
                                Applicant must answer this question to apply.
                            </FormDescription>
                            </div>
                        </FormItem>
                        )}
                    />
                    {index < fields.length -1 && <Separator className="my-4"/>}
                  </Card>
                ))}
                 {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No custom questions added yet. Click "Add Question" to get started.
                    </p>
                )}
              </div>


              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Post Job"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
