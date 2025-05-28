require('dotenv').config({ path: '.env.local' });

// This script generates synthetic job data and adds it to MySQL database.

const { getConnection } = require('./src/lib/db'); // Import the getConnection function

const generateJobData = (providerUserIds) => {
  // Existing data arrays
  const skills = ['React', 'Angular', 'Vue', 'Node.js', 'Express.js', 'Django', 'Flask', 'Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'SQL', 'NoSQL', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Agile', 'Scrum', 'Project Management', 'UI/UX Design', 'Graphic Design', 'Content Writing', 'Data Analysis', 'Machine Learning', 'AI', 'Blockchain', 'Cybersecurity'];
  const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Remote'];
  const jobTitles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Data Scientist', 'Marketing Manager', 'Sales Executive', 'HR Manager', 'DevOps Engineer', 'Cloud Architect', 'Product Manager', 'Business Analyst', 'UX Designer', 'Content Strategist'];
  const companies = ['TCS', 'Infosys', 'Wipro', 'HCLTech', 'Tech Mahindra', 'Cognizant', 'Capgemini', 'Accenture', 'IBM', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Paytm', 'Ola'];

  // New data arrays based on schema
  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Freelance'];
  const experienceLevels = ['Entry-level', 'Mid-level', 'Senior-level', 'Lead', 'Manager', 'Executive'];
  const salaryPeriods = ['hourly', 'daily', 'weekly', 'monthly', 'annually'];

  const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const title = randomFromArray(jobTitles);
  const company_name_override = randomFromArray(companies);
  const location = randomFromArray(locations);
  
  const numSkills = Math.floor(Math.random() * 3) + 2; // 2 to 4 skills
  const selectedSkills = new Set();
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
    // Potentially throw an error or return null to be handled by the caller
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

const generateApplicationData = (jobListingId, seekerUserId) => {
  const statuses = ['Submitted', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn'];
  const coverLetterTemplates = [
    "Dear Hiring Manager, I am very interested in the {jobTitle} position. My skills in {skills} make me a strong candidate. I look forward to hearing from you.",
    "To Whom It May Concern, I am writing to apply for the {jobTitle} role. I have been following {companyName} for some time and am impressed with your work in {industry}. My resume provides further detail on my accomplishments.",
    "Hello, I believe my experience in {field} and skills such as {skill1} and {skill2} align perfectly with the requirements for the {jobTitle} position. I am eager to learn more.",
  ];
  const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const status = randomFromArray(statuses); // Could be weighted for more realism
  const cover_letter_text = randomFromArray(coverLetterTemplates)
    .replace('{jobTitle}', 'this role') // Generic placeholders for now
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
    notes_from_provider: null, // Keep internal notes null for synthetic data
  };
};


const fetchUserIdsByRole = async (connection, role) => {
  const [rows] = await connection.execute('SELECT id FROM users WHERE role = ?', [role]);
  if (rows.length === 0) {
    console.warn(`Warning: No users found with role '${role}'.`);
    return [];
  }
  return rows.map(row => row.id);
};

const main = async () => {
  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    const providerUserIds = await fetchUserIdsByRole(connection, 'job_provider');
    const seekerUserIds = await fetchUserIdsByRole(connection, 'job_seeker');

    if (providerUserIds.length === 0) {
      console.error("Fatal: No job providers found in the database. Cannot generate job listings.");
      await connection.rollback(); // Rollback before exiting
      process.exit(1);
    }
    if (seekerUserIds.length === 0) {
      console.warn("Warning: No job seekers found. No applications will be generated.");
      // Continue to generate jobs, but applications won't be possible.
    }

    const numberOfJobsToGenerate = Math.floor(Math.random() * (500 - 100 + 1)) + 100; // 100 to 500 jobs
    let jobsGeneratedCount = 0;
    let applicationsGeneratedCount = 0;

    console.log(`Attempting to generate ${numberOfJobsToGenerate} jobs...`);

    for (let i = 0; i < numberOfJobsToGenerate; i++) {
      const jobData = generateJobData(providerUserIds);
      if (!jobData) continue; // Skip if job data generation failed (e.g. no providers)

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
      
      const [result] = await connection.execute(jobQuery, jobValues);
      const newJobId = result.insertId;
      jobsGeneratedCount++;

      // Generate applications for this job
      if (seekerUserIds.length > 0) {
        const numberOfApplications = Math.floor(Math.random() * 16); // 0 to 15 applications
        for (let j = 0; j < numberOfApplications; j++) {
          const seekerUserId = seekerUserIds[Math.floor(Math.random() * seekerUserIds.length)];
          const appData = generateApplicationData(newJobId, seekerUserId);

          // Check for unique constraint (job_listing_id, seeker_user_id)
          // For simplicity in a script, we might skip this check and let DB handle it,
          // or ensure seekerUserId is unique for this job's applications in this loop.
          // A more robust way would be to track applied seekers per job.
          // For now, we'll assume the random chance of collision is low for synthetic data.

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
          } catch (appError) {
            if (appError.code === 'ER_DUP_ENTRY') {
              // console.warn(`Skipped duplicate application for job ${newJobId} by seeker ${seekerUserId}`);
            } else {
              throw appError; // Re-throw other errors
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
    if (!process.exitCode) {
        process.exit(0); 
    }
  }
};

main();
