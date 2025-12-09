-- Create enum for ID document types
CREATE TYPE public.id_document_type AS ENUM ('drivers_license', 'passport', 'national_id');

-- Create enum for verification status
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create provider_verifications table
CREATE TABLE public.provider_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  document_type public.id_document_type NOT NULL,
  document_url TEXT NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;

-- Providers can view their own verification
CREATE POLICY "Providers can view their own verification"
ON public.provider_verifications
FOR SELECT
USING (auth.uid() = provider_id);

-- Providers can insert their own verification (once)
CREATE POLICY "Providers can submit verification"
ON public.provider_verifications
FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- Providers can update their verification only if rejected (to resubmit)
CREATE POLICY "Providers can update rejected verification"
ON public.provider_verifications
FOR UPDATE
USING (auth.uid() = provider_id AND status = 'rejected');

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.provider_verifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update verifications (approve/reject)
CREATE POLICY "Admins can update verifications"
ON public.provider_verifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for ID documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('id-documents', 'id-documents', false);

-- Storage policies for ID documents
CREATE POLICY "Providers can upload their own ID documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Providers can view their own ID documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all ID documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'id-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_provider_verifications_updated_at
BEFORE UPDATE ON public.provider_verifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();