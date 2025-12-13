-- Add photo_type to job_completion_photos for before/after distinction
ALTER TABLE public.job_completion_photos 
ADD COLUMN photo_type text NOT NULL DEFAULT 'after' 
CHECK (photo_type IN ('before', 'after'));

-- Create dispute_photos table for customer evidence
CREATE TABLE public.dispute_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.job_disputes(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_photos ENABLE ROW LEVEL SECURITY;

-- Customers can upload dispute photos
CREATE POLICY "Customers can upload dispute photos" ON public.dispute_photos
FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM public.job_disputes 
    WHERE id = dispute_id AND customer_id = auth.uid()
  )
);

-- Job participants can view dispute photos
CREATE POLICY "Job participants can view dispute photos" ON public.dispute_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.job_disputes jd
    JOIN public.job_requests jr ON jr.id = jd.job_id
    WHERE jd.id = dispute_id 
    AND (jr.customer_id = auth.uid() OR jr.accepted_provider_id = auth.uid())
  )
);

-- Create dispute_responses table for provider responses
CREATE TABLE public.dispute_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.job_disputes(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  response_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_responses ENABLE ROW LEVEL SECURITY;

-- Providers can create responses
CREATE POLICY "Providers can create dispute responses" ON public.dispute_responses
FOR INSERT WITH CHECK (
  auth.uid() = provider_id AND
  EXISTS (
    SELECT 1 FROM public.job_disputes jd
    JOIN public.job_requests jr ON jr.id = jd.job_id
    WHERE jd.id = dispute_id AND jr.accepted_provider_id = auth.uid()
  )
);

-- Job participants can view responses
CREATE POLICY "Job participants can view dispute responses" ON public.dispute_responses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.job_disputes jd
    JOIN public.job_requests jr ON jr.id = jd.job_id
    WHERE jd.id = dispute_id 
    AND (jr.customer_id = auth.uid() OR jr.accepted_provider_id = auth.uid())
  )
);

-- Create dispute_response_photos table
CREATE TABLE public.dispute_response_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.dispute_responses(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispute_response_photos ENABLE ROW LEVEL SECURITY;

-- Providers can upload response photos
CREATE POLICY "Providers can upload response photos" ON public.dispute_response_photos
FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM public.dispute_responses dr
    WHERE dr.id = response_id AND dr.provider_id = auth.uid()
  )
);

-- Job participants can view response photos
CREATE POLICY "Job participants can view response photos" ON public.dispute_response_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dispute_responses dr
    JOIN public.job_disputes jd ON jd.id = dr.dispute_id
    JOIN public.job_requests jr ON jr.id = jd.job_id
    WHERE dr.id = response_id 
    AND (jr.customer_id = auth.uid() OR jr.accepted_provider_id = auth.uid())
  )
);

-- Add admins can view policies
CREATE POLICY "Admins can view dispute photos" ON public.dispute_photos
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view dispute responses" ON public.dispute_responses
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view response photos" ON public.dispute_response_photos
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to count provider disputes this month
CREATE OR REPLACE FUNCTION public.get_provider_disputes_this_month(provider_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM job_disputes jd
  JOIN job_requests jr ON jr.id = jd.job_id
  WHERE jr.accepted_provider_id = provider_id
    AND jd.created_at >= date_trunc('month', CURRENT_DATE)
    AND jd.created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';
$$;