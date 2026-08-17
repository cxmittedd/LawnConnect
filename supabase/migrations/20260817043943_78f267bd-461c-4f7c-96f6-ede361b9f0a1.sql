CREATE OR REPLACE FUNCTION public.prevent_discount_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-expire: once a coupon is redeemed it is stamped and deactivated
  IF NEW.used = true AND OLD.used = false THEN
    NEW.used_at := COALESCE(NEW.used_at, now());
    NEW.active := false;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- A redeemed coupon can never be reactivated or reused by a customer
  IF OLD.used = true AND NEW.used = false THEN
    RAISE EXCEPTION 'A redeemed coupon cannot be reset';
  END IF;

  IF NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.label IS DISTINCT FROM OLD.label
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR (NEW.active IS DISTINCT FROM OLD.active AND NOT (NEW.used = true AND OLD.used = false)) THEN
    RAISE EXCEPTION 'Only redemption fields can be updated';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_discount_tampering() FROM PUBLIC, anon, authenticated;

-- Backfill: deactivate any coupon already marked used
UPDATE public.customer_discounts
SET active = false,
    used_at = COALESCE(used_at, now())
WHERE used = true AND active = true;