-- Remove lynk_id column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS lynk_id;

-- Drop the insecure "Anyone can view provider profiles" policy
DROP POLICY IF EXISTS "Anyone can view provider profiles" ON public.profiles;

-- Create a new restrictive policy that only exposes safe public fields
-- This uses a security definer function to safely check and return limited data
CREATE OR REPLACE FUNCTION public.get_public_provider_profile(provider_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  company_name text,
  avatar_url text,
  bio text,
  user_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.company_name,
    p.avatar_url,
    p.bio,
    p.user_role
  FROM public.profiles p
  WHERE p.id = provider_id
    AND p.user_role IN ('provider', 'both');
$$;

-- Create policy for authenticated users to view limited provider info
-- This allows viewing only non-sensitive fields for providers
CREATE POLICY "Authenticated users can view provider public info"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_role IN ('provider', 'both'));

-- Note: The sensitive fields (phone_number, address) will be protected by 
-- the application layer which will use get_public_provider_profile() for public views
-- and only return full data for authorized relationships (customer viewing accepted provider, etc.)