
-- Add community column to job_requests
ALTER TABLE public.job_requests ADD COLUMN community text DEFAULT NULL;

-- Backfill existing Coral Spring jobs
UPDATE public.job_requests 
SET community = 'coral_spring' 
WHERE location LIKE 'Coral Spring%';

-- Create provider_community_assignments table
CREATE TABLE public.provider_community_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  community text NOT NULL,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, community)
);

ALTER TABLE public.provider_community_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage assignments
CREATE POLICY "Admins can view all assignments"
ON public.provider_community_assignments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert assignments"
ON public.provider_community_assignments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assignments"
ON public.provider_community_assignments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Providers can view their own assignments
CREATE POLICY "Providers can view their own assignments"
ON public.provider_community_assignments
FOR SELECT
USING (auth.uid() = provider_id);

-- Update the get_provider_job_listings function to filter by community
CREATE OR REPLACE FUNCTION public.get_provider_job_listings()
RETURNS TABLE(
  id uuid,
  title text,
  parish text,
  location text,
  description text,
  lawn_size text,
  preferred_date date,
  preferred_time text,
  additional_requirements text,
  base_price numeric,
  final_price numeric,
  provider_payout numeric,
  customer_offer numeric,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    jr.id,
    jr.title,
    jr.parish,
    jr.location,
    jr.description,
    jr.lawn_size,
    jr.preferred_date,
    jr.preferred_time,
    jr.additional_requirements,
    jr.base_price,
    jr.final_price,
    jr.provider_payout,
    jr.customer_offer,
    jr.status,
    jr.created_at
  FROM job_requests jr
  WHERE jr.status IN ('open', 'in_negotiation')
    AND jr.accepted_provider_id IS NULL
    AND jr.payment_status = 'paid'
    AND is_provider(auth.uid())
    -- Community filtering: if job has a community, provider must be assigned to it
    AND (
      jr.community IS NULL
      OR EXISTS (
        SELECT 1 FROM provider_community_assignments pca
        WHERE pca.provider_id = auth.uid()
        AND pca.community = jr.community
      )
    )
  ORDER BY jr.created_at ASC;
$$;
