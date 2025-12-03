-- Allow providers to view customer profiles for jobs they're assigned to
CREATE POLICY "Providers can view customer profiles for their jobs" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.job_requests 
    WHERE customer_id = profiles.id 
    AND accepted_provider_id = auth.uid()
  )
);