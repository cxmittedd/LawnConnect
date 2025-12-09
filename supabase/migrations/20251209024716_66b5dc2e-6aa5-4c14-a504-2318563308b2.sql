-- Drop existing provider and public access policies on job_requests
DROP POLICY IF EXISTS "Providers can view open job requests" ON public.job_requests;
DROP POLICY IF EXISTS "Anyone can view completed jobs for portfolios" ON public.job_requests;

-- Create a more restrictive policy for providers viewing open jobs
-- Providers can only view essential job details (not customer_id) for open jobs
-- This is enforced at the RLS level - they can SELECT but customer_id should be handled in app code
-- We allow SELECT but the app should use a view or function to filter sensitive columns
CREATE POLICY "Providers can view open job requests"
ON public.job_requests
FOR SELECT
TO authenticated
USING (
  (status IN ('open', 'in_negotiation') AND is_provider(auth.uid()))
  OR (auth.uid() = accepted_provider_id)
);

-- Create a restrictive policy for viewing completed jobs - only participants can see them
-- Remove public access to protect customer privacy
CREATE POLICY "Participants can view completed jobs"
ON public.job_requests
FOR SELECT
TO authenticated
USING (
  status = 'completed' 
  AND (auth.uid() = customer_id OR auth.uid() = accepted_provider_id)
);

-- Create a function to get job listings for providers without exposing customer_id
CREATE OR REPLACE FUNCTION public.get_provider_job_listings()
RETURNS TABLE (
  id uuid,
  title text,
  location text,
  parish text,
  description text,
  lawn_size text,
  preferred_date date,
  preferred_time text,
  additional_requirements text,
  base_price numeric,
  customer_offer numeric,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    jr.id,
    jr.title,
    jr.location,
    jr.parish,
    jr.description,
    jr.lawn_size,
    jr.preferred_date,
    jr.preferred_time,
    jr.additional_requirements,
    jr.base_price,
    jr.customer_offer,
    jr.status,
    jr.created_at
  FROM job_requests jr
  WHERE jr.status IN ('open', 'in_negotiation')
  ORDER BY jr.created_at DESC;
$$;