REVOKE EXECUTE ON FUNCTION public.get_public_provider_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_provider_completed_jobs_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_verified_banking(uuid) FROM authenticated;