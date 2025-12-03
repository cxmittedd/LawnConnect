-- Create a table for job completion photos
CREATE TABLE public.job_completion_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_completion_photos ENABLE ROW LEVEL SECURITY;

-- Only the provider can upload completion photos for their accepted jobs
CREATE POLICY "Providers can upload completion photos"
ON public.job_completion_photos
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = job_completion_photos.job_id
    AND job_requests.accepted_provider_id = auth.uid()
  )
);

-- Only customer and provider can view completion photos (NOT public)
CREATE POLICY "Job participants can view completion photos"
ON public.job_completion_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id = job_completion_photos.job_id
    AND (job_requests.customer_id = auth.uid() OR job_requests.accepted_provider_id = auth.uid())
  )
);

-- Create a PRIVATE storage bucket for completion photos
INSERT INTO storage.buckets (id, name, public) VALUES ('completion-photos', 'completion-photos', false);

-- Storage policies: Only provider can upload for their jobs
CREATE POLICY "Providers can upload completion photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'completion-photos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id::text = (storage.foldername(name))[1]
    AND job_requests.accepted_provider_id = auth.uid()
  )
);

-- Storage policies: Only customer and provider can view/download
CREATE POLICY "Job participants can view completion photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'completion-photos' AND
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.id::text = (storage.foldername(name))[1]
    AND (job_requests.customer_id = auth.uid() OR job_requests.accepted_provider_id = auth.uid())
  )
);