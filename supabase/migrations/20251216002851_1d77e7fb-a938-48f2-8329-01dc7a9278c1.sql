-- Drop existing proposal-based policies that expose sensitive data
DROP POLICY IF EXISTS "Authenticated users can view profiles for active relationships" ON public.profiles;
DROP POLICY IF EXISTS "Customers can view provider profiles for proposals" ON public.profiles;
DROP POLICY IF EXISTS "Providers can view customer profiles for active jobs" ON public.profiles;

-- Create new secure policy: only allow profile access through accepted job relationships
CREATE POLICY "Users can view profiles for accepted job relationships"
ON public.profiles
FOR SELECT
USING (
  -- Users can always view their own profile
  (auth.uid() = id)
  OR
  -- Customers can view their accepted provider's profile (active jobs only)
  (EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.accepted_provider_id = profiles.id
    AND job_requests.customer_id = auth.uid()
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion')
  ))
  OR
  -- Providers can view their customer's profile (active jobs only)
  (EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.customer_id = profiles.id
    AND job_requests.accepted_provider_id = auth.uid()
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion')
  ))
);