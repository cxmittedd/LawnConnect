CREATE OR REPLACE FUNCTION public.enforce_job_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_size_price NUMERIC;
  v_extra NUMERIC := 0;
  v_base NUMERIC;
  v_coupon_pct INT := 0;
  v_allowed_discount NUMERIC := 0;
  v_min_final NUMERIC;
  v_is_small BOOLEAN;
  v_jwt_role TEXT;
BEGIN
  BEGIN
    v_jwt_role := COALESCE(
      current_setting('request.jwt.claim.role', true),
      (NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role')
    );
  EXCEPTION WHEN others THEN
    v_jwt_role := NULL;
  END;

  -- Backend (service role) inserts already derive prices from trusted data.
  -- current_user is the definer inside this function, so check session_user / JWT role too.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR session_user IN ('service_role', 'postgres', 'supabase_admin')
     OR v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins may set prices manually (support / corrections)
  IF auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) THEN
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

  NEW.base_price := v_base;
  NEW.platform_fee := ROUND(v_base * 0.30, 2);
  NEW.provider_payout := ROUND(v_base * 0.70, 2);

  IF v_is_small THEN
    SELECT COALESCE(MAX(discount_percentage), 0) INTO v_coupon_pct
    FROM public.customer_discounts
    WHERE customer_id = NEW.customer_id
      AND active = true
      AND used = false;
    v_allowed_discount := ROUND(v_size_price * (LEAST(v_coupon_pct, 100)::numeric / 100));
  END IF;

  v_min_final := GREATEST(0, v_base - v_allowed_discount);

  IF NEW.final_price IS NULL THEN
    NEW.final_price := v_base;
  END IF;

  IF NEW.final_price < v_min_final OR NEW.final_price > v_base THEN
    RAISE EXCEPTION 'Invalid job price';
  END IF;

  IF COALESCE(NEW.payment_status, 'pending') <> 'pending' THEN
    NEW.payment_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;