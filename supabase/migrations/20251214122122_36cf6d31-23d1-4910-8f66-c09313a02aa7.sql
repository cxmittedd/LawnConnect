-- Drop the existing policy that allows providers to view customer profiles for active jobs
DROP POLICY IF EXISTS "Providers can view customer profiles for active jobs" ON public.profiles;

-- Create a new policy that explicitly excludes completed jobs
-- Providers can ONLY view customer profiles while jobs are in progress (not completed)
CREATE POLICY "Providers can view customer profiles for active jobs" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.customer_id = profiles.id 
    AND job_requests.accepted_provider_id = auth.uid() 
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion')
  )
);

-- Also update the "Authenticated users can view profiles for active relationships" policy
-- to exclude completed jobs for provider-to-customer access
DROP POLICY IF EXISTS "Authenticated users can view profiles for active relationships" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles for active relationships" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  (auth.uid() = id) 
  OR 
  -- Customers can view provider profiles who submitted proposals for their open/active jobs
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
  -- Customers can view their accepted provider's profile for active jobs
  (EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.accepted_provider_id = profiles.id 
    AND job_requests.customer_id = auth.uid() 
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion')
  ))
);