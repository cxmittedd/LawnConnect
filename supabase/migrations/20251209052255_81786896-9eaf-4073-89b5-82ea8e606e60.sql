-- Drop the existing policy that exposes phone numbers permanently
DROP POLICY IF EXISTS "Providers can view customer profiles for their jobs" ON public.profiles;

-- Create a new policy that only allows viewing customer profiles for ACTIVE jobs (not completed)
CREATE POLICY "Providers can view customer profiles for active jobs"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.customer_id = profiles.id
      AND job_requests.accepted_provider_id = auth.uid()
      AND job_requests.status NOT IN ('completed')
  )
);

-- Also update the "Authenticated users can view provider basic info" policy to restrict sensitive data exposure
DROP POLICY IF EXISTS "Authenticated users can view provider basic info" ON public.profiles;

-- Recreate with more restricted access - only for active job relationships
CREATE POLICY "Authenticated users can view profiles for active relationships"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) -- Own profile
  OR (
    -- Customers viewing providers who submitted proposals for their open/in_negotiation jobs
    EXISTS (
      SELECT 1 FROM job_proposals jp
      JOIN job_requests jr ON jr.id = jp.job_id
      WHERE jp.provider_id = profiles.id
        AND jr.customer_id = auth.uid()
        AND jr.status IN ('open', 'in_negotiation', 'accepted', 'in_progress')
    )
  )
  OR (
    -- Providers viewing customers for their active accepted jobs
    EXISTS (
      SELECT 1 FROM job_requests
      WHERE job_requests.customer_id = profiles.id
        AND job_requests.accepted_provider_id = auth.uid()
        AND job_requests.status IN ('accepted', 'in_progress')
    )
  )
  OR (
    -- Customers viewing providers for their active accepted jobs
    EXISTS (
      SELECT 1 FROM job_requests
      WHERE job_requests.accepted_provider_id = profiles.id
        AND job_requests.customer_id = auth.uid()
        AND job_requests.status IN ('accepted', 'in_progress')
    )
  )
);