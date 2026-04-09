
-- Add coupon-related columns to customer_discounts
ALTER TABLE public.customer_discounts
  ADD COLUMN code TEXT NOT NULL DEFAULT '',
  ADD COLUMN used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN used_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN used_on_job_id UUID;

-- Remove the unique constraint on customer_id (allow multiple coupons per customer)
ALTER TABLE public.customer_discounts DROP CONSTRAINT IF EXISTS customer_discounts_customer_id_key;

-- Add unique constraint on code
ALTER TABLE public.customer_discounts ADD CONSTRAINT customer_discounts_code_key UNIQUE (code);

-- Allow customers to update their own coupon (to redeem it)
CREATE POLICY "Customers can redeem their own coupon"
ON public.customer_discounts FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id AND used = false AND active = true);
