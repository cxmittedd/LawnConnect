-- Drop and recreate the view with SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.provider_public_profiles;

CREATE VIEW public.provider_public_profiles 
WITH (security_invoker = true)
AS
SELECT 
    id,
    first_name AS full_name,
    first_name,
    company_name,
    avatar_url,
    bio,
    user_role
FROM profiles
WHERE user_role IN ('provider', 'both');