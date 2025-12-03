-- Add parish column to job_requests table
ALTER TABLE public.job_requests ADD COLUMN parish text NOT NULL DEFAULT 'Kingston';