-- Drop the insecure "Anyone can view job photos" policy
DROP POLICY IF EXISTS "Anyone can view job photos" ON storage.objects;

-- Create a new secure policy that restricts access to job participants
CREATE POLICY "Job participants can view job photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos' AND
  (
    -- Job owner can view
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.customer_id = auth.uid()
      AND job_requests.id::text = (storage.foldername(name))[1]
    )
    OR
    -- Accepted provider can view
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.accepted_provider_id = auth.uid()
      AND job_requests.id::text = (storage.foldername(name))[1]
    )
    OR
    -- Open jobs can be viewed by verified providers
    EXISTS (
      SELECT 1 FROM public.job_requests
      WHERE job_requests.id::text = (storage.foldername(name))[1]
      AND job_requests.status IN ('open', 'in_negotiation')
      AND EXISTS (
        SELECT 1 FROM public.provider_verifications
        WHERE provider_verifications.provider_id = auth.uid()
        AND provider_verifications.status = 'approved'
      )
    )
  )
);