-- Fix user_consents INSERT policy to require auth.uid() = user_id
DROP POLICY IF EXISTS "Allow consent insert for valid users" ON public.user_consents;

CREATE POLICY "Authenticated users can insert their own consent"
ON public.user_consents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);