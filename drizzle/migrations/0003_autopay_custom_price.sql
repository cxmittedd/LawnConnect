ALTER TABLE public.autopay_schedules
  ADD COLUMN IF NOT EXISTS custom_price NUMERIC;

COMMENT ON COLUMN public.autopay_schedules.custom_price IS 'Admin-agreed fixed monthly price (from a custom quote). Only settable by service_role or admins.';

CREATE OR REPLACE FUNCTION public.enforce_autopay_custom_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.custom_price := NULL;
  ELSE
    NEW.custom_price := OLD.custom_price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_autopay_custom_price_ins ON public.autopay_schedules;
CREATE TRIGGER enforce_autopay_custom_price_ins
  BEFORE INSERT ON public.autopay_schedules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_autopay_custom_price();

DROP TRIGGER IF EXISTS enforce_autopay_custom_price_upd ON public.autopay_schedules;
CREATE TRIGGER enforce_autopay_custom_price_upd
  BEFORE UPDATE ON public.autopay_schedules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_autopay_custom_price();