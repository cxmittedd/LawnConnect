
-- Create customer_discounts table for admin-managed percentage discounts
CREATE TABLE public.customer_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  label TEXT NOT NULL DEFAULT 'Discount',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

-- Enable RLS
ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all customer discounts"
ON public.customer_discounts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert customer discounts"
ON public.customer_discounts FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Admins can update customer discounts"
ON public.customer_discounts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete customer discounts"
ON public.customer_discounts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Customers can view their own active discount
CREATE POLICY "Customers can view their own discount"
ON public.customer_discounts FOR SELECT
TO authenticated
USING (auth.uid() = customer_id AND active = true);

-- Trigger for updated_at
CREATE TRIGGER update_customer_discounts_updated_at
BEFORE UPDATE ON public.customer_discounts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
