-- Allow customers to view reviews for providers who submitted proposals to their jobs
CREATE POLICY "Customers can view provider reviews for proposals" 
ON public.reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM job_proposals jp
    JOIN job_requests jr ON jr.id = jp.job_id
    WHERE jp.provider_id = reviews.reviewee_id
    AND jr.customer_id = auth.uid()
  )
);