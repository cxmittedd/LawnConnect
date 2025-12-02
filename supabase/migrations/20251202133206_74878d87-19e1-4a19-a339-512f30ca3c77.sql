-- Add provider_completed_at to track when provider marks job complete
ALTER TABLE public.job_requests 
ADD COLUMN provider_completed_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.job_requests.provider_completed_at IS 'Timestamp when provider marked the job as complete, awaiting customer confirmation';