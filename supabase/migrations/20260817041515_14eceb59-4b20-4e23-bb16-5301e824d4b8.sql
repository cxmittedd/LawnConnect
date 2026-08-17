-- 1) Lock down internal SECURITY DEFINER functions from client roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_referral_signup() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.award_referral_on_job_completion() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_referral_code(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_customer_payment_field_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.record_signup_on_profile_creation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.send_welcome_email_on_confirmation() FROM anon, authenticated;

-- 2) Remove anonymous access to functions that must require a signed-in user
REVOKE ALL ON FUNCTION public.apply_referral_credits(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.refund_referral_credits(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_profile_safe(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_customer_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_provider_job_listings() FROM anon;
REVOKE ALL ON FUNCTION public.get_provider_disputes_this_month(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_provider_late_jobs_this_month(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_verified_banking(uuid) FROM anon;

-- 3) Restrict job photo visibility to authenticated participants / approved providers
DROP POLICY IF EXISTS "Users can view job photos" ON public.job_photos;
CREATE POLICY "Users can view job photos"
ON public.job_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_requests jr
    WHERE jr.id = job_photos.job_id
      AND (
        jr.customer_id = auth.uid()
        OR jr.accepted_provider_id = auth.uid()
        OR (
          jr.status = ANY (ARRAY['open'::text, 'in_negotiation'::text])
          AND EXISTS (
            SELECT 1 FROM public.provider_verifications pv
            WHERE pv.provider_id = auth.uid()
              AND pv.status = 'approved'::verification_status
          )
        )
      )
  )
);