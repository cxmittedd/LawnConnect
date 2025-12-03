-- Create a table for job disputes
CREATE TABLE public.job_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_disputes ENABLE ROW LEVEL SECURITY;

-- Customers can create disputes for their jobs
CREATE POLICY "Customers can create disputes"
ON public.job_disputes
FOR INSERT
WITH CHECK (
  auth.uid() = customer_id AND
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = job_disputes.job_id
    AND job_requests.customer_id = auth.uid()
  )
);

-- Job participants can view disputes
CREATE POLICY "Job participants can view disputes"
ON public.job_disputes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = job_disputes.job_id
    AND (job_requests.customer_id = auth.uid() OR job_requests.accepted_provider_id = auth.uid())
  )
);

-- Providers can update disputes (to resolve them by uploading new photos)
CREATE POLICY "Providers can update disputes"
ON public.job_disputes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = job_disputes.job_id
    AND job_requests.accepted_provider_id = auth.uid()
  )
);