-- Add accepted_at column to track when a provider accepts a job
ALTER TABLE public.job_requests ADD COLUMN accepted_at timestamp with time zone;