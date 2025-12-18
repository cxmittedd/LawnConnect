-- Create table to track provider payouts
CREATE TABLE public.provider_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  jobs_count INTEGER NOT NULL DEFAULT 0,
  payout_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  job_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;

-- Providers can view their own payouts
CREATE POLICY "Providers can view their own payouts"
ON public.provider_payouts
FOR SELECT
USING (auth.uid() = provider_id);

-- Service role can insert payouts (for edge function)
CREATE POLICY "Service role can insert payouts"
ON public.provider_payouts
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_provider_payouts_provider_id ON public.provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_payout_date ON public.provider_payouts(payout_date);