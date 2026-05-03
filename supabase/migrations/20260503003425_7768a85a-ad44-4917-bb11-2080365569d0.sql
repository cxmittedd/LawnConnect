-- Remove overly-permissive INSERT policies on financial tables.
-- The service role bypasses RLS natively, so these policies are not needed
-- and currently allow ANY authenticated user (including anon) to forge records.

DROP POLICY IF EXISTS "Service role can insert payouts" ON public.provider_payouts;
DROP POLICY IF EXISTS "Service role can insert invoices" ON public.invoices;
