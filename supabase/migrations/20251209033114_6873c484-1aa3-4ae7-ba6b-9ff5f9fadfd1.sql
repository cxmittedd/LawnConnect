-- Create function to get completed jobs count for a provider (publicly accessible)
CREATE OR REPLACE FUNCTION public.get_provider_completed_jobs_count(provider_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM job_requests
  WHERE accepted_provider_id = provider_id
    AND status = 'completed';
$$;