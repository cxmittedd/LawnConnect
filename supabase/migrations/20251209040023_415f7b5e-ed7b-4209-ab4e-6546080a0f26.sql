-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.provider_public_profiles;

CREATE VIEW public.provider_public_profiles 
WITH (security_invoker = true)
AS
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