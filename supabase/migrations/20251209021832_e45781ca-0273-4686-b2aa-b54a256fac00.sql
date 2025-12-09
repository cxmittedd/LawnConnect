-- Add column for back of ID document (for driver's license)
ALTER TABLE public.provider_verifications
ADD COLUMN document_back_url text;