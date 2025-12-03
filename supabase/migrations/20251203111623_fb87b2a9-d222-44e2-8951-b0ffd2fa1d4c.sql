-- Allow authenticated users to view completed jobs for provider portfolios
CREATE POLICY "Anyone can view completed jobs for portfolios" 
ON public.job_requests 
FOR SELECT 
USING (status = 'completed');