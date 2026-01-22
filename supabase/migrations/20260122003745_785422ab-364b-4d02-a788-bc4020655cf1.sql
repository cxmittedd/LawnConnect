-- Fix: Restrict profile visibility to only show contact info AFTER job is accepted
-- Remove access during 'open' and 'in_negotiation' phases to prevent harvesting

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view authorized profiles" ON public.profiles;

-- Create new policy that restricts access to active job participants only (accepted or later)
CREATE POLICY "Users can view authorized profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) 
  OR (EXISTS ( 
    SELECT 1
    FROM job_requests
    WHERE (
      (job_requests.customer_id = profiles.id AND job_requests.accepted_provider_id = auth.uid()) 
      OR (job_requests.accepted_provider_id = profiles.id AND job_requests.customer_id = auth.uid())
    )
    AND job_requests.status = ANY (ARRAY['accepted'::text, 'in_progress'::text, 'pending_completion'::text, 'completed'::text])
  ))
);