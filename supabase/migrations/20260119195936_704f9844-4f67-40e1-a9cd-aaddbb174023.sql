-- Fix profiles table RLS policies to properly protect sensitive data
-- Current issue: RESTRICTIVE policies require ALL to match, but we need ANY to match

-- First, drop the existing SELECT policies that conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles for accepted job relationships" ON public.profiles;

-- Create a single, comprehensive PERMISSIVE SELECT policy that:
-- 1. Allows users to view their own profile
-- 2. Allows customers and providers with ACTIVE job relationships to see each other's profiles
-- 3. Allows completed job participants to see each other's profiles for historical context
-- Using PERMISSIVE (default) so any matching condition grants access
CREATE POLICY "Users can view authorized profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Own profile: full access
  auth.uid() = id
  OR
  -- Provider viewing customer for active/completed job they accepted
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.customer_id = profiles.id
    AND job_requests.accepted_provider_id = auth.uid()
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion', 'completed')
  )
  OR
  -- Customer viewing provider for their active/completed job
  EXISTS (
    SELECT 1 FROM job_requests
    WHERE job_requests.accepted_provider_id = profiles.id
    AND job_requests.customer_id = auth.uid()
    AND job_requests.status IN ('accepted', 'in_progress', 'pending_completion', 'completed')
  )
);