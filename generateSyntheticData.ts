import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// This script generates synthetic job data and adds it to MySQL database.

import { getConnection } from './src/lib/db'; // Import the getConnection function

const generateJobData = (providerUserIds: number[]) => {
  // Existing data arrays
  const skills = ['React', 'Angular', 'Vue', 'Node.js', 'Express.js', 'Django', 'Flask', 'Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'SQL', 'NoSQL', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Agile', 'Scrum', 'Project Management', 'UI/UX Design', 'Graphic Design', 'Content Writing', 'Data Analysis', 'Machine Learning', 'AI', 'Blockchain', 'Cybersecurity'];
  const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Remote'];
  const jobTitles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Data Scientist', 'Marketing Manager', 'Sales Executive', 'HR Manager', 'DevOps Engineer', 'Cloud Architect', 'Product Manager', 'Business Analyst', 'UX Designer', 'Content Strategist'];
  const companies = ['TCS', 'Infosys', 'Wipro', 'HCLTech', 'Tech Mahindra', 'Cognizant', 'Capgemini', 'Accenture', 'IBM', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Paytm', 'Ola'];

  // New data arrays based on schema
  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Freelance'];
  const experienceLevels = ['Entry-level', 'Mid-level', 'Senior-level', 'Lead', 'Manager', 'Executive'];
  const salaryPeriods = ['hourly', 'daily', 'weekly', 'monthly', 'annually'];

  const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const title = randomFromArray(jobTitles);
  const company_name_override = randomFromArray(companies);
  const location = randomFromArray(locations);
  
  const numSkills = Math.floor(Math.random() * 3) + 2; // 2 to 4 skills
  const selectedSkills = new Set<string>();
  while (selectedSkills.size < numSkills) {
    selectedSkills.add(randomFromArray(skills));
  }
  const required_skills = Array.from(selectedSkills).join(', ');

  const description = `We are seeking a talented ${title} to join our dynamic team at ${company_name_override} in ${location}. The ideal candidate will be proficient in ${required_skills}. This role involves designing, developing, and maintaining high-quality software solutions, collaborating with cross-functional teams, and contributing to all phases of the product lifecycle. If you are passionate about technology and looking for a challenging yet rewarding opportunity, we would love to hear from you.`;

  const salary_min = Math.floor(Math.random() * 100000 + 300000) / 100; // e.g., 3000.00 to 13000.00
  const salary_max = salary_min + Math.floor(Math.random() * 500000 + 200000) / 100; // min + 2000.00 to 7000.00
  const salary_currency = 'INR';
  const salary_period = randomFromArray(salaryPeriods);

  const job_type = randomFromArray(jobTypes);
  const experience_level = randomFromArray(experienceLevels);

  const posted_at = new Date();
  // Ensure expires_at is in the future, and application_deadline is before expires_at
  const daysUntilExpiry = Math.floor(Math.random() * 30) + 30; // 30-59 days
  const expires_at = new Date(posted_at.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  
  const daysBeforeExpiryForDeadline = Math.floor(Math.random() * Math.min(daysUntilExpiry -1, 7)) + 1; // 1 to 7 days before expiry, but not after posted_at
  const application_deadline = new Date(expires_at.getTime() - daysBeforeExpiryForDeadline * 24 * 60 * 60 * 1000);


  if (providerUserIds.length === 0) {
    console.error("Error: No provider user IDs found. Cannot generate jobs.");
    return null; 
  }
  const provider_user_id = providerUserIds[Math.floor(Math.random() * providerUserIds.length)];

  return {
    provider_user_id,
    title,
    description,
    company_name_override,
    location,
    salary_min,
    salary_max,
    salary_currency,
    salary_period,
    job_type,
    experience_level,
    required_skills,
    posted_at,
    expires_at,
    is_active: true,
    application_deadline,
    how_to_apply: `Please apply through our company portal at https://careers.${company_name_override.toLowerCase().replace(/\s+/g, '')}.com/apply/${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-6)} or email your resume to careers@${company_name_override.toLowerCase().replace(/\s+/g, '')}.com.`,
  };
};

// Helper function to generate synthetic custom questions for a job
const generateCustomQuestionsData = (jobListingId: number) => {
  const questions = [];
  const questionTypes = ['text', 'textarea', 'select', 'radio'];
  const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const numQuestions = Math.floor(Math.random() * 3) + 1; // 1 to 3 questions

  for (let i = 0; i < numQuestions; i++) {
    const type = randomFromArray(questionTypes);
    let options_list: string | null = null;
    let label = '';

    switch (type) {
      case 'text':
        label = `What is your expected CTC (in LPA)?`;
        break;
      case 'textarea':
        label = `Briefly describe your relevant experience for this role.`;
        break;
      case 'select':
        label = `How did you hear about this job?`;
        options_list = 'LinkedIn,Company Website,Referral,Job Portal,Other';
        break;
      case 'radio':
        label = `Are you willing to relocate for this position?`;
        options_list = 'Yes,No,Maybe';
        break;
    }

    questions.push({
      job_listing_id: jobListingId,
      question_label: label,
      question_type: type,
      options_list: options_list,
      is_required: Math.random() > 0.5, // 50% chance of being required
      display_order: i
    });
  }
  return questions;
};


const generateApplicationData = (jobListingId: number, seekerUserId: number) => {
  const statuses = ['Submitted', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn'];
  const coverLetterTemplates = [
    "Dear Hiring Manager, I am very interested in the {jobTitle} position. My skills in {skills} make me a strong candidate. I look forward to hearing from you.",
    "To Whom It May Concern, I am writing to apply for the {jobTitle} role. I have been following {companyName} for some time and am impressed with your work in {industry}. My resume provides further detail on my accomplishments.",
    "Hello, I believe my experience in {field} and skills such as {skill1} and {skill2} align perfectly with the requirements for the {jobTitle} position. I am eager to learn more.",
  ];
  const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const status = randomFromArray(statuses);
  const cover_letter_text = randomFromArray(coverLetterTemplates)
    .replace('{jobTitle}', 'this role') 
    .replace('{skills}', 'relevant technologies')
    .replace('{companyName}', 'your company')
    .replace('{industry}', 'your industry')
    .replace('{field}', 'this field')
    .replace('{skill1}', 'key skill A')
    .replace('{skill2}', 'key skill B');

  const resume_snapshot_url = `https://example.com/resumes/user${seekerUserId}_resume_${Date.now().toString(36)}.pdf`;
  const notes_for_provider = Math.random() > 0.7 ? `Attached my portfolio for your review.` : null;

  return {
    job_listing_id: jobListingId,
    seeker_user_id: seekerUserId,
    application_date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Applied in the last 30 days
    status,
    cover_letter_text,
    resume_snapshot_url,
    notes_for_provider,
    notes_from_provider: null,
  };
};

const generateUserData = (role: 'job_provider' | 'job_seeker', index: number) => {
  const now = Date.now();
  const uniqueSuffix = `${now}_${index}`;
  return {
    firebase_uid: `fake_firebase_uid_${role}_${uniqueSuffix}`,
    email: `fake_${role}_${uniqueSuffix}@example.com`,
    role: role,
  };
};

const insertSyntheticUsers = async (connection: any, role: 'job_provider' | 'job_seeker', count: number): Promise<number[]> => {
  const generatedUserIds: number[] = [];
  console.log(`Attempting to generate ${count} synthetic users with role '${role}'...`);
  for (let i = 0; i < count; i++) {
    const userData = generateUserData(role, i);
    const query = 'INSERT INTO users (firebase_uid, email, role) VALUES (?, ?, ?)';
    try {
      const [result] = await connection.execute(query, [userData.firebase_uid, userData.email, userData.role]) as [any, any];
      generatedUserIds.push(result.insertId);
    } catch (error: any) {
      // Handle potential duplicate entries if script is run multiple times with same static fake UIDs/emails
      // For this script, we assume uniqueSuffix makes them unique enough for a single run.
      console.error(`Error inserting synthetic user ${userData.email}:`, error.message);
    }
  }
  console.log(`Successfully inserted ${generatedUserIds.length} users with role '${role}'.`);
  return generatedUserIds;
};

const fetchUserIdsByRole = async (connection: any, role: 'job_provider' | 'job_seeker'): Promise<number[]> => {
  const [rows] = await connection.execute('SELECT id FROM users WHERE role = ?', [role]) as [any[], any];
  if (rows.length === 0) {
    // console.warn(`Warning: No users found with role '${role}'. Script will attempt to generate them.`);
    return [];
  }
  return rows.map(row => row.id);
};

const main = async () => {
  let connection: any; 
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    let providerUserIds = await fetchUserIdsByRole(connection, 'job_provider');
    if (providerUserIds.length === 0) {
      console.log("No job providers found. Generating synthetic job providers...");
      providerUserIds = await insertSyntheticUsers(connection, 'job_provider', 10); // Generate 10 providers
      if (providerUserIds.length === 0) {
        console.error("Fatal: Failed to generate synthetic job providers. Cannot generate job listings.");
        if (connection) await connection.rollback();
        process.exit(1);
      }
    }

    // Remove job seeker generation and fetching
    // let seekerUserIds = await fetchUserIdsByRole(connection, 'job_seeker');
    // if (seekerUserIds.length === 0) {
    //   console.log("No job seekers found. Generating synthetic job seekers...");
    //   seekerUserIds = await insertSyntheticUsers(connection, 'job_seeker', 50); // Generate 50 seekers
    //   if (seekerUserIds.length === 0) {
    //     console.warn("Warning: Failed to generate synthetic job seekers. No applications will be generated.");
    //   }
    // }
    const seekerUserIds: number[] = []; // Ensure seekerUserIds is an empty array

    const numberOfJobsToGenerate = Math.floor(Math.random() * (500 - 100 + 1)) + 100; // 100 to 500 jobs
    let jobsGeneratedCount = 0;
    let applicationsGeneratedCount = 0;

    console.log(`Attempting to generate ${numberOfJobsToGenerate} jobs...`);

    for (let i = 0; i < numberOfJobsToGenerate; i++) {
      const jobData = generateJobData(providerUserIds);
      if (!jobData) continue; 

      const jobQuery = `
        INSERT INTO job_listings (
          provider_user_id, title, description, company_name_override, location,
          salary_min, salary_max, salary_currency, salary_period, job_type,
          experience_level, required_skills, posted_at, expires_at, is_active,
          application_deadline, how_to_apply
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const jobValues = [
        jobData.provider_user_id, jobData.title, jobData.description, jobData.company_name_override,
        jobData.location, jobData.salary_min, jobData.salary_max, jobData.salary_currency,
        jobData.salary_period, jobData.job_type, jobData.experience_level, jobData.required_skills,
        jobData.posted_at, jobData.expires_at, jobData.is_active, jobData.application_deadline,
        jobData.how_to_apply,
      ];
      
      const [result] = await connection.execute(jobQuery, jobValues) as [any, any];
      const newJobId = result.insertId;
      jobsGeneratedCount++;

      // Generate and insert custom questions for the new job
      const customQuestions = generateCustomQuestionsData(newJobId);
      if (customQuestions.length > 0) {
        const questionQuery = `
          INSERT INTO job_custom_questions (
            job_listing_id, question_label, question_type, options_list, is_required, display_order
          ) VALUES (?, ?, ?, ?, ?, ?);
        `;
        for (let k = 0; k < customQuestions.length; k++) {
          const q = customQuestions[k];
          await connection.execute(questionQuery, [
            q.job_listing_id,
            q.question_label,
            q.question_type,
            q.options_list,
            q.is_required,
            q.display_order
          ]);
        }
      }

      // Application generation will be skipped as seekerUserIds is empty
      if (seekerUserIds.length > 0) {
        const numberOfApplications = Math.floor(Math.random() * 16); // 0 to 15 applications
        for (let j = 0; j < numberOfApplications; j++) {
          const seekerUserId = seekerUserIds[Math.floor(Math.random() * seekerUserIds.length)];
          const appData = generateApplicationData(newJobId, seekerUserId);

          const appQuery = `
            INSERT INTO applications (
              job_listing_id, seeker_user_id, application_date, status,
              cover_letter_text, resume_snapshot_url, notes_for_provider
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          const appValues = [
            appData.job_listing_id, appData.seeker_user_id, appData.application_date,
            appData.status, appData.cover_letter_text, appData.resume_snapshot_url,
            appData.notes_for_provider,
          ];
          try {
            await connection.execute(appQuery, appValues);
            applicationsGeneratedCount++;
          } catch (appError: any) {
            if (appError.code === 'ER_DUP_ENTRY') {
              // console.warn(`Skipped duplicate application for job ${newJobId} by seeker ${seekerUserId}`);
            } else {
              throw appError; 
            }
          }
        }
      }
    }

    await connection.commit();
    console.log(`Successfully generated and inserted ${jobsGeneratedCount} jobs.`);
    console.log(`Successfully generated and inserted ${applicationsGeneratedCount} applications.`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error during synthetic data generation:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    // Check if process.exitCode is already set to avoid overriding an error exit code
    if (process.exitCode === undefined || process.exitCode === 0) {
        process.exit(0); 
    }
  }
};

main();
