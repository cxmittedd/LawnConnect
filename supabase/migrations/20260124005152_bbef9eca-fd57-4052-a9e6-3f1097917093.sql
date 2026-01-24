-- Replace overly permissive policies with more secure alternatives
-- For signup_analytics: only the trigger should insert (via SECURITY DEFINER function)
-- For user_consents: allow anonymous insert but only for valid user_ids that exist in profiles

DROP POLICY IF EXISTS "Allow insert for own user_id" ON public.signup_analytics;
DROP POLICY IF EXISTS "Allow insert for own user_id" ON public.user_consents;

-- signup_analytics: No public insert policy needed since trigger handles it
-- The trigger function runs with SECURITY DEFINER so it bypasses RLS

-- user_consents: Allow insert only if the user_id exists in profiles (was just created)
CREATE POLICY "Allow consent insert for valid users" 
ON public.user_consents 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id)
);