CREATE TABLE public.custom_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Regular Lawn Cut + Cleanup',
  description text,
  parish text NOT NULL,
  community text,
  location text NOT NULL,
  lawn_size text,
  price numeric NOT NULL CHECK (price > 0),
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending',
  job_id uuid REFERENCES public.job_requests(id) ON DELETE SET NULL,
  claimed_by uuid,
  claimed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_quotes TO authenticated;
GRANT ALL ON public.custom_quotes TO service_role;

ALTER TABLE public.custom_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom quotes"
ON public.custom_quotes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_custom_quotes_updated_at
BEFORE UPDATE ON public.custom_quotes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Server-side job creation (service role only) may set its own trusted price,
-- which is how admin custom quotes are charged.
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
  -- Backend (service role) inserts already derive prices from trusted data
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

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
$function$;