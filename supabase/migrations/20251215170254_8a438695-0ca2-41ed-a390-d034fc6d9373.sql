-- Add policy for providers to claim open jobs
CREATE POLICY "Providers can claim open jobs"
ON public.job_requests
FOR UPDATE
USING (
  status = 'open'
  AND accepted_provider_id IS NULL
  AND payment_status = 'paid'
  AND is_provider(auth.uid())
)
WITH CHECK (
  accepted_provider_id = auth.uid()
  AND status = 'accepted'
);