CREATE DATABASE IF NOT EXISTS job_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE job_portal;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `firebase_uid` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Firebase User ID',
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `role` VARCHAR(15) NOT NULL COMMENT 'job-seeker or job-provider',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Job Provider Profiles Table
CREATE TABLE IF NOT EXISTS `job_provider_profiles` (
  `user_id` INT PRIMARY KEY COMMENT 'FK to users.id',
  `company_name` VARCHAR(255) NULL,
  `company_website` VARCHAR(255) NULL,
  `company_logo_url` VARCHAR(255) NULL,
  `company_description` TEXT NULL,
  `contact_email` VARCHAR(255) NULL,
  `phone_number` VARCHAR(50) NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Job Seeker Profiles Table
CREATE TABLE IF NOT EXISTS `job_seeker_profiles` (
  `user_id` INT PRIMARY KEY COMMENT 'FK to users.id',
  `full_name` VARCHAR(255) NULL,
  `headline` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `resume_url` VARCHAR(255) NULL,
  `portfolio_url` VARCHAR(255) NULL,
  `linkedin_profile_url` VARCHAR(255) NULL,
  `skills` TEXT NULL COMMENT 'Comma-separated, or JSON',
  `contact_number` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `experience` TEXT NULL,
  `years_of_experience` VARCHAR(50) NULL,
  `education` TEXT NULL COMMENT 'JSON stringified array of education entries',
  `profile_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `profile_data_json` JSON NULL COMMENT 'Stores full profile data as JSON',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Job Listings Table
CREATE TABLE IF NOT EXISTS `job_listings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider_user_id` INT NOT NULL COMMENT 'FK to users.id (job_provider)',
  `title` VARCHAR(255) NOT NULL,
  `short_description` VARCHAR(255) NULL COMMENT 'Brief summary',
  `description` TEXT NOT NULL,
  `company_name_override` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `salary_min` DECIMAL(12, 2) NULL,
  `salary_max` DECIMAL(12, 2) NULL,
  `salary_currency` VARCHAR(10) DEFAULT 'INR',
  `salary_period` ENUM('hourly', 'daily', 'weekly', 'monthly', 'annually') NULL,
  `job_type` ENUM('Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Freelance') NULL,
  `experience_level` ENUM('Entry-level', 'Mid-level', 'Senior-level', 'Lead', 'Manager', 'Executive') NULL,
  `required_skills` TEXT NULL COMMENT 'Comma-separated',
  `posted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `application_deadline` TIMESTAMP NULL,
  `how_to_apply` TEXT NULL COMMENT 'External link or instructions',
  FOREIGN KEY (`provider_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_job_listings_provider` (`provider_user_id`),
  INDEX `idx_job_listings_active_posted` (`is_active`, `posted_at`),
  INDEX `idx_job_listings_job_type` (`job_type`),
  INDEX `idx_job_listings_location` (`location`),
  FULLTEXT KEY `ft_job_search` (`title`, `short_description`, `description`, `company_name_override`, `required_skills`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Applications Table
CREATE TABLE IF NOT EXISTS `applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_listing_id` INT NOT NULL,
  `seeker_user_id` INT NOT NULL,
  `application_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('Submitted', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn') DEFAULT 'Submitted',
  `cover_letter_text` TEXT NULL,
  `resume_snapshot_url` VARCHAR(255) NULL,
  `notes_for_provider` TEXT NULL,
  `notes_from_provider` TEXT NULL,
  `custom_answers` JSON NULL COMMENT 'JSON object for custom question answers',
  FOREIGN KEY (`job_listing_id`) REFERENCES `job_listings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seeker_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_application_job_seeker` (`job_listing_id`, `seeker_user_id`),
  INDEX `idx_applications_seeker` (`seeker_user_id`),
  INDEX `idx_applications_job` (`job_listing_id`),
  INDEX `idx_applications_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Job Custom Questions Table
CREATE TABLE IF NOT EXISTS `job_custom_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_listing_id` INT NOT NULL,
  `question_label` TEXT NOT NULL,
  `question_type` ENUM('text', 'textarea', 'select', 'radio') NOT NULL,
  `options_list` TEXT NULL COMMENT 'Comma-separated for select/radio',
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `display_order` INT DEFAULT 0,
  FOREIGN KEY (`job_listing_id`) REFERENCES `job_listings`(`id`) ON DELETE CASCADE,
  INDEX `idx_job_custom_questions_job_id` (`job_listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
