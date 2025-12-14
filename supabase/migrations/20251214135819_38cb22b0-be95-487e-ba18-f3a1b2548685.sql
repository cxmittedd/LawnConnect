
-- Create invoices table to store invoice history
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  job_location TEXT NOT NULL,
  parish TEXT NOT NULL,
  lawn_size TEXT,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Customers can view their own invoices
CREATE POLICY "Customers can view their own invoices"
ON public.invoices
FOR SELECT
USING (auth.uid() = customer_id);

-- System can insert invoices (via edge function with service role)
CREATE POLICY "Service role can insert invoices"
ON public.invoices
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_job_id ON public.invoices(job_id);
