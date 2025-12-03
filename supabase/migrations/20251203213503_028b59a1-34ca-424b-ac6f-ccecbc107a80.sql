-- Create a security definer function to check if user has provider role
CREATE OR REPLACE FUNCTION public.is_provider(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND user_role IN ('provider', 'both')
  )
$$;

-- Drop the existing INSERT policy for job_proposals
DROP POLICY IF EXISTS "Providers can create proposals" ON public.job_proposals;

-- Create new INSERT policy that requires provider role
CREATE POLICY "Providers can create proposals"
ON public.job_proposals
FOR INSERT
WITH CHECK (
  auth.uid() = provider_id 
  AND is_provider(auth.uid())
);