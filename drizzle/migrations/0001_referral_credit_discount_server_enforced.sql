-- Referral credits may only discount a job through apply_referral_credits(),
-- which marks the credits used in the same transaction. The insert-time pricing
-- trigger no longer trusts a discounted final_price based on merely *owning*
-- unused credits, so the same credits can no longer be reused across jobs.

CREATE OR REPLACE FUNCTION public.enforce_job_pricing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_size_price NUMERIC;
  v_extra NUMERIC := 0;
  v_base NUMERIC;
  v_coupon_pct INT := 0;
  v_allowed_discount NUMERIC := 0;
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

  -- Only a coupon may discount the price at insert time. Referral credits are
  -- applied afterwards by apply_referral_credits(), which redeems them.
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

  -- Customers may never create a job that is already marked paid
  IF COALESCE(NEW.payment_status, 'pending') <> 'pending' THEN
    NEW.payment_status := 'pending';
  END IF;

  RETURN NEW;
END;
$function$;

-- Redeem credits AND reduce the job price atomically, so a discount can only
-- exist where matching credits were consumed.
CREATE OR REPLACE FUNCTION public.apply_referral_credits(_job_id uuid, _credit_count integer)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_job RECORD;
  v_total NUMERIC := 0;
  v_to_use INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _credit_count IS NULL OR _credit_count < 1 THEN RETURN 0; END IF;

  v_to_use := LEAST(_credit_count, 3);

  SELECT id, customer_id, base_price, final_price, payment_status
    INTO v_job
  FROM public.job_requests
  WHERE id = _job_id
  FOR UPDATE;

  IF v_job.id IS NULL OR v_job.customer_id <> v_user_id THEN
    RAISE EXCEPTION 'Job not found or unauthorized';
  END IF;

  IF COALESCE(v_job.payment_status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'Credits cannot be applied to a job that is already paid';
  END IF;

  WITH selected AS (
    SELECT id, amount FROM public.referral_credits
    WHERE user_id = v_user_id AND used = false
    ORDER BY created_at ASC
    LIMIT v_to_use
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE public.referral_credits rc
    SET used = true, used_at = now(), used_on_job_id = _job_id
    FROM selected s
    WHERE rc.id = s.id
    RETURNING rc.amount
  )
  SELECT COALESCE(SUM(amount),0) INTO v_total FROM updated;

  IF v_total > 0 THEN
    PERFORM set_config('app.server_price_adjustment', 'on', true);
    UPDATE public.job_requests
    SET final_price = GREATEST(0, COALESCE(final_price, base_price) - v_total)
    WHERE id = _job_id;
    PERFORM set_config('app.server_price_adjustment', 'off', true);
  END IF;

  RETURN v_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_referral_credits(_job_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner UUID;
  v_count INT;
  v_amount NUMERIC := 0;
BEGIN
  SELECT customer_id INTO v_owner FROM public.job_requests WHERE id = _job_id;
  IF v_owner IS NULL OR (v_owner <> v_user_id AND NOT has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH refunded AS (
    UPDATE public.referral_credits
    SET used = false, used_at = NULL, used_on_job_id = NULL
    WHERE used_on_job_id = _job_id
    RETURNING amount
  )
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_count, v_amount FROM refunded;

  IF v_amount > 0 THEN
    PERFORM set_config('app.server_price_adjustment', 'on', true);
    UPDATE public.job_requests
    SET final_price = LEAST(base_price, COALESCE(final_price, 0) + v_amount)
    WHERE id = _job_id
      AND COALESCE(payment_status, 'pending') = 'pending';
    PERFORM set_config('app.server_price_adjustment', 'off', true);
  END IF;

  RETURN v_count;
END;
$function$;

-- Allow the two definer functions above (and only them) to adjust final_price.
CREATE OR REPLACE FUNCTION public.prevent_customer_payment_field_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_server_adjustment BOOLEAN := COALESCE(current_setting('app.server_price_adjustment', true), 'off') = 'on';
BEGIN
  IF OLD.customer_id = auth.uid()
     AND OLD.accepted_provider_id IS DISTINCT FROM auth.uid()
     AND NOT has_role(auth.uid(), 'admin') THEN

    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      RAISE EXCEPTION 'Customers cannot modify payment_status';
    END IF;

    IF OLD.payment_reference IS DISTINCT FROM NEW.payment_reference THEN
      RAISE EXCEPTION 'Customers cannot modify payment_reference';
    END IF;

    IF OLD.payment_confirmed_at IS DISTINCT FROM NEW.payment_confirmed_at THEN
      RAISE EXCEPTION 'Customers cannot modify payment_confirmed_at';
    END IF;

    IF OLD.payment_confirmed_by IS DISTINCT FROM NEW.payment_confirmed_by THEN
      RAISE EXCEPTION 'Customers cannot modify payment_confirmed_by';
    END IF;

    IF OLD.final_price IS DISTINCT FROM NEW.final_price AND NOT v_server_adjustment THEN
      RAISE EXCEPTION 'Customers cannot modify final_price';
    END IF;

    IF OLD.platform_fee IS DISTINCT FROM NEW.platform_fee THEN
      RAISE EXCEPTION 'Customers cannot modify platform_fee';
    END IF;

    IF OLD.provider_payout IS DISTINCT FROM NEW.provider_payout THEN
      RAISE EXCEPTION 'Customers cannot modify provider_payout';
    END IF;

    IF OLD.accepted_provider_id IS DISTINCT FROM NEW.accepted_provider_id THEN
      RAISE EXCEPTION 'Customers cannot modify accepted_provider_id';
    END IF;

    IF OLD.provider_completed_at IS DISTINCT FROM NEW.provider_completed_at THEN
      RAISE EXCEPTION 'Customers cannot modify provider_completed_at';
    END IF;

    IF OLD.completed_at IS DISTINCT FROM NEW.completed_at THEN
      RAISE EXCEPTION 'Customers cannot modify completed_at';
    END IF;

    IF OLD.is_late_completion IS DISTINCT FROM NEW.is_late_completion THEN
      RAISE EXCEPTION 'Customers cannot modify is_late_completion';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
