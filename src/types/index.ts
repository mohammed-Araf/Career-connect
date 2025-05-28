
export type UserRole = 'job-seeker' | 'job-provider';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  profileCompleted?: boolean; // Added for job seeker profile completion status
}

export type CustomFormFieldType = 'text' | 'textarea' | 'select' | 'radio';

export interface CustomFormField {
  id?: string; // Used by useFieldArray, can be omitted if using index as key
  label: string;
  type: CustomFormFieldType;
  options?: string; // Comma-separated for select/radio
  isRequired: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  shortDescription: string;
  description: string;
  // Updated to match database ENUM and ApiJob type
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary' | 'Freelance' | null;
  experienceLevel?: 'Entry-level' | 'Mid-level' | 'Senior-level' | 'Lead' | 'Manager' | 'Executive' | null; // Added
  postedDate: string; // ISO date string
  salary?: string;
  skills?: string[];
  companyLogoUrl?: string;
  applyUrl?: string;
  customQuestions?: CustomFormField[]; // Added to store custom questions with a job
}
