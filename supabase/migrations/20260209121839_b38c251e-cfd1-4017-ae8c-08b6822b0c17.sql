CREATE POLICY "Admins can view all job requests"
ON public.job_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));