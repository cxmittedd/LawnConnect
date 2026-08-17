DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- Re-grant only what the app legitimately needs
GRANT EXECUTE ON FUNCTION public.get_public_provider_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_completed_jobs_count(uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_verified_banking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_job_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_disputes_this_month(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_late_jobs_this_month(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_referral_credits(uuid) TO authenticated;