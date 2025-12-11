-- Add column to track late completions
ALTER TABLE public.job_requests ADD COLUMN IF NOT EXISTS is_late_completion boolean DEFAULT false;

-- Create a function to count late jobs for a provider in the current month
CREATE OR REPLACE FUNCTION public.get_provider_late_jobs_this_month(provider_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM job_requests
  WHERE accepted_provider_id = provider_id
    AND is_late_completion = true
    AND provider_completed_at >= date_trunc('month', CURRENT_DATE)
    AND provider_completed_at < date_trunc('month', CURRENT_DATE) + interval '1 month';
$$;