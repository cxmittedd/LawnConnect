-- Allow customers to view provider profiles for proposals on their jobs
CREATE POLICY "Customers can view provider profiles for proposals"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM job_proposals jp
    JOIN job_requests jr ON jr.id = jp.job_id
    WHERE jp.provider_id = profiles.id
    AND jr.customer_id = auth.uid()
  )
);