-- Add selfie_url column to provider_verifications for live photo verification
ALTER TABLE public.provider_verifications 
ADD COLUMN selfie_url text;