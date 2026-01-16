-- Create enum for banking verification status
CREATE TYPE public.banking_status AS ENUM ('pending', 'verified', 'rejected');

-- Create enum for supported banks
CREATE TYPE public.supported_bank AS ENUM ('scotiabank_jamaica', 'ncb_jamaica');

-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('savings', 'chequing');

-- Create provider banking details table
CREATE TABLE public.provider_banking_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL UNIQUE,
  full_legal_name TEXT NOT NULL,
  bank_name public.supported_bank NOT NULL,
  branch_name TEXT NOT NULL,
  branch_number TEXT,
  account_number TEXT NOT NULL,
  account_type public.account_type NOT NULL,
  trn TEXT NOT NULL,
  status public.banking_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_banking_details ENABLE ROW LEVEL SECURITY;

-- Providers can view their own banking details
CREATE POLICY "Providers can view their own banking details"
ON public.provider_banking_details
FOR SELECT
USING (auth.uid() = provider_id);

-- Providers can insert their own banking details
CREATE POLICY "Providers can insert their own banking details"
ON public.provider_banking_details
FOR INSERT
WITH CHECK (auth.uid() = provider_id AND is_provider(auth.uid()));

-- Providers can update their own banking details only if pending or rejected
CREATE POLICY "Providers can update rejected banking details"
ON public.provider_banking_details
FOR UPDATE
USING (auth.uid() = provider_id AND status IN ('pending', 'rejected'))
WITH CHECK (auth.uid() = provider_id);

-- Admins can view all banking details
CREATE POLICY "Admins can view all banking details"
ON public.provider_banking_details
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update banking details (for verification)
CREATE POLICY "Admins can update banking details"
ON public.provider_banking_details
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_provider_banking_details_updated_at
BEFORE UPDATE ON public.provider_banking_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create a function to check if provider has verified banking
CREATE OR REPLACE FUNCTION public.has_verified_banking(provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.provider_banking_details
    WHERE provider_banking_details.provider_id = $1
    AND status = 'verified'
  )
$$;