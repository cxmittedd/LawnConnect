-- Drop and recreate the policy to add symmetrical privacy protection
DROP POLICY IF EXISTS "Authenticated users can view profiles for active relationships" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles for active relationships" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  (auth.uid() = id) 
  OR 
  -- Customers can view provider profiles who submitted proposals for their open/active jobs (NOT completed)
  (EXISTS (
    SELECT 1 FROM job_proposals jp
    JOIN job_requests jr ON jr.id = jp.job_id
    WHERE jp.provider_id = profiles.id 
    AND jr.customer_id = auth.uid() 
    AND jr.status IN ('open', 'in_negotiation', 'accepted', 'in_progress', 'pending_completion')
  )) 
  OR 
  -- Providers can view customer profiles ONLY for active (non-completed) jobs
  (EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.customer_id = profiles.id 
    AND job_requests.accepted_provider_id = auth.uid() 
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion')
  )) 
  OR 
  -- Customers can view their accepted provider's profile ONLY for active (non-completed) jobs
  (EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.accepted_provider_id = profiles.id 
    AND job_requests.customer_id = auth.uid() 
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion')
  ))
);

-- Also update the "Customers can view provider profiles for proposals" policy
-- to exclude completed jobs
DROP POLICY IF EXISTS "Customers can view provider profiles for proposals" ON public.profiles;

CREATE POLICY "Customers can view provider profiles for proposals" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM job_proposals jp
    JOIN job_requests jr ON jr.id = jp.job_id
    WHERE jp.provider_id = profiles.id 
    AND jr.customer_id = auth.uid()
    AND jr.status IN ('open', 'in_negotiation', 'accepted', 'in_progress', 'pending_completion')
  )
);