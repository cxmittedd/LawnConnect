-- Create a secure view that only exposes safe public fields for providers
CREATE OR REPLACE VIEW public.provider_public_profiles AS
SELECT 
  id,
  full_name,
  company_name,
  avatar_url,
  bio,
  user_role
FROM public.profiles
WHERE user_role IN ('provider', 'both');

-- Grant access to the view
GRANT SELECT ON public.provider_public_profiles TO authenticated;
GRANT SELECT ON public.provider_public_profiles TO anon;

-- Drop the overly permissive RLS policy that exposes all columns including address
DROP POLICY IF EXISTS "Authenticated users can view provider public info" ON public.profiles;

-- Create a more restrictive policy that only allows viewing specific columns
-- This policy allows viewing providers but the view should be used instead for public access
CREATE POLICY "Authenticated users can view provider basic info" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR
  -- Or they have a legitimate business relationship (proposal/job)
  EXISTS (
    SELECT 1 FROM job_proposals jp
    JOIN job_requests jr ON jr.id = jp.job_id
    WHERE (jp.provider_id = profiles.id AND jr.customer_id = auth.uid())
       OR (jr.customer_id = profiles.id AND jp.provider_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE (customer_id = profiles.id AND accepted_provider_id = auth.uid())
       OR (accepted_provider_id = profiles.id AND customer_id = auth.uid())
  )
);