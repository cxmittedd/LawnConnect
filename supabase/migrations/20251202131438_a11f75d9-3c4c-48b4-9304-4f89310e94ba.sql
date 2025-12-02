-- Add Lynk ID to profiles for payment receipt
ALTER TABLE public.profiles 
ADD COLUMN lynk_id text;

-- Add payment tracking fields to job_requests
ALTER TABLE public.job_requests 
ADD COLUMN payment_reference text,
ADD COLUMN payment_confirmed_at timestamp with time zone,
ADD COLUMN payment_confirmed_by uuid REFERENCES auth.users(id);

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.lynk_id IS 'Provider Lynk mobile payment ID for receiving payments';
COMMENT ON COLUMN public.job_requests.payment_reference IS 'Customer provided Lynk transaction reference';
COMMENT ON COLUMN public.job_requests.payment_confirmed_at IS 'When provider confirmed payment receipt';
COMMENT ON COLUMN public.job_requests.payment_confirmed_by IS 'Provider who confirmed payment';