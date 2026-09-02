-- 1. Prevent providers from self-verifying banking details
CREATE OR REPLACE FUNCTION public.enforce_banking_status_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending'::banking_status;
    NEW.admin_notes := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE by non-admin (provider editing their own details)
  NEW.status := 'pending'::banking_status;
  NEW.admin_notes := OLD.admin_notes;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.provider_id := OLD.provider_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_banking_status_integrity_ins ON public.provider_banking_details;
CREATE TRIGGER enforce_banking_status_integrity_ins
BEFORE INSERT ON public.provider_banking_details
FOR EACH ROW EXECUTE FUNCTION public.enforce_banking_status_integrity();

DROP TRIGGER IF EXISTS enforce_banking_status_integrity_upd ON public.provider_banking_details;
CREATE TRIGGER enforce_banking_status_integrity_upd
BEFORE UPDATE ON public.provider_banking_details
FOR EACH ROW EXECUTE FUNCTION public.enforce_banking_status_integrity();

-- 2. Prevent providers from tampering with job money fields
CREATE OR REPLACE FUNCTION public.prevent_provider_financial_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.accepted_provider_id OR auth.uid() = NEW.accepted_provider_id THEN
    IF OLD.customer_id = auth.uid() THEN
      RETURN NEW; -- handled by the customer trigger
    END IF;

    NEW.base_price := OLD.base_price;
    NEW.final_price := OLD.final_price;
    NEW.platform_fee := OLD.platform_fee;
    NEW.provider_payout := OLD.provider_payout;
    NEW.customer_offer := OLD.customer_offer;
    NEW.payment_status := OLD.payment_status;
    NEW.payment_reference := OLD.payment_reference;
    NEW.payment_confirmed_at := OLD.payment_confirmed_at;
    NEW.payment_confirmed_by := OLD.payment_confirmed_by;
    NEW.customer_id := OLD.customer_id;
    NEW.lawn_size := OLD.lawn_size;
    NEW.title := OLD.title;

    -- A provider may only claim an unassigned job or keep themselves assigned
    IF OLD.accepted_provider_id IS NOT NULL AND NEW.accepted_provider_id IS DISTINCT FROM OLD.accepted_provider_id THEN
      RAISE EXCEPTION 'Providers cannot reassign jobs';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_provider_financial_changes_trg ON public.job_requests;
CREATE TRIGGER prevent_provider_financial_changes_trg
BEFORE UPDATE ON public.job_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_financial_changes();

-- 3. Tighten coupon redemption policy with a WITH CHECK clause
DROP POLICY IF EXISTS "Customers can redeem their own coupon" ON public.customer_discounts;
CREATE POLICY "Customers can redeem their own coupon"
ON public.customer_discounts
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id AND used = false AND active = true)
WITH CHECK (auth.uid() = customer_id AND used = true AND active = false);
