-- 1. Server-side authoritative pricing for job_requests
CREATE OR REPLACE FUNCTION public.enforce_job_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_size_price NUMERIC;
  v_extra NUMERIC := 0;
  v_base NUMERIC;
  v_coupon_pct INT := 0;
  v_allowed_discount NUMERIC := 0;
  v_credits INT := 0;
  v_min_final NUMERIC;
  v_is_small BOOLEAN;
BEGIN
  -- Admins may set prices manually (support / corrections)
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  v_is_small := COALESCE(NEW.lawn_size, '') ILIKE 'Small%';

  v_size_price := CASE
    WHEN COALESCE(NEW.lawn_size, '') ILIKE 'Small%'  THEN 7000
    WHEN COALESCE(NEW.lawn_size, '') ILIKE 'Medium%' THEN 13000
    WHEN COALESCE(NEW.lawn_size, '') ILIKE 'Large%'  THEN 18500
    WHEN COALESCE(NEW.lawn_size, '') ILIKE 'Extra Large%' THEN 35000
    ELSE 5000
  END;

  IF COALESCE(NEW.title, '') = 'Lawn Cut (Overgrown Grass)' THEN
    v_extra := 1500;
  END IF;

  v_base := v_size_price + v_extra;

  -- Authoritative gross figures: ignore whatever the client sent
  NEW.base_price := v_base;
  NEW.platform_fee := ROUND(v_base * 0.30, 2);
  NEW.provider_payout := ROUND(v_base * 0.70, 2);

  -- Largest discount this customer could legitimately receive
  IF v_is_small THEN
    SELECT COALESCE(MAX(discount_percentage), 0) INTO v_coupon_pct
    FROM public.customer_discounts
    WHERE customer_id = NEW.customer_id
      AND active = true
      AND used = false;
    v_allowed_discount := ROUND(v_size_price * (LEAST(v_coupon_pct, 100)::numeric / 100));
  END IF;

  SELECT COUNT(*) INTO v_credits
  FROM public.referral_credits
  WHERE user_id = NEW.customer_id AND used = false;

  v_allowed_discount := v_allowed_discount + (LEAST(v_credits, 3) * 1000);

  v_min_final := GREATEST(0, v_base - v_allowed_discount);

  IF NEW.final_price IS NULL THEN
    NEW.final_price := v_base;
  END IF;

  IF NEW.final_price < v_min_final OR NEW.final_price > v_base THEN
    RAISE EXCEPTION 'Invalid job price';
  END IF;

  -- Customers may never create a job that is already marked paid
  IF COALESCE(NEW.payment_status, 'pending') <> 'pending' THEN
    NEW.payment_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_job_pricing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_job_pricing_trigger ON public.job_requests;
CREATE TRIGGER enforce_job_pricing_trigger
BEFORE INSERT ON public.job_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_pricing();

-- 2. Lock coupon fields so customers can only redeem, not rewrite
CREATE OR REPLACE FUNCTION public.prevent_discount_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.label IS DISTINCT FROM OLD.label
     OR NEW.active IS DISTINCT FROM OLD.active
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'Only redemption fields can be updated';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_discount_tampering() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_discount_tampering_trigger ON public.customer_discounts;
CREATE TRIGGER prevent_discount_tampering_trigger
BEFORE UPDATE ON public.customer_discounts
FOR EACH ROW EXECUTE FUNCTION public.prevent_discount_tampering();