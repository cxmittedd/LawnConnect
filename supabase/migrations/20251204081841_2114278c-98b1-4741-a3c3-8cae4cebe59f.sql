-- Create table to store user consent records for legal compliance
CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  consent_version text NOT NULL,
  consented_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  
  UNIQUE(user_id, consent_type)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent records
CREATE POLICY "Users can view their own consents"
ON public.user_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can insert their own consents"
ON public.user_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);