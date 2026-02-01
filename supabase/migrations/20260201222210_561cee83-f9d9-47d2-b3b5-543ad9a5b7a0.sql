-- Drop the existing overly permissive customer update policy
DROP POLICY IF EXISTS "Customers can update their own job requests" ON public.job_requests;

-- Create a more restrictive policy that only allows customers to update non-payment fields
-- Customers should NOT be able to modify: payment_status, payment_reference, payment_confirmed_at,
-- payment_confirmed_by, final_price, platform_fee, provider_payout, accepted_provider_id
CREATE POLICY "Customers can update non-payment fields only"
ON public.job_requests
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (
  auth.uid() = customer_id
  -- Ensure payment-related fields cannot be changed by customers
  -- by checking the new values match the old values (enforced at trigger level)
);

-- Create a trigger function to prevent customers from modifying payment fields
CREATE OR REPLACE FUNCTION public.prevent_customer_payment_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is NOT the accepted provider and NOT an admin, they are the customer
  -- Check if they're trying to modify protected fields
  IF OLD.customer_id = auth.uid() 
     AND OLD.accepted_provider_id IS DISTINCT FROM auth.uid()
     AND NOT has_role(auth.uid(), 'admin') THEN
    
    -- Prevent changes to payment-related fields
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
    
    IF OLD.final_price IS DISTINCT FROM NEW.final_price THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_customer_payment_changes ON public.job_requests;
CREATE TRIGGER prevent_customer_payment_changes
  BEFORE UPDATE ON public.job_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_customer_payment_field_changes();