-- Drop the existing function first, then recreate with updated return type
DROP FUNCTION IF EXISTS public.get_provider_job_listings();

CREATE FUNCTION public.get_provider_job_listings()
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
  created_at timestamp with time zone
) 
LANGUAGE sql
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
    AND is_provider(auth.uid()) -- Only allow providers to view job listings
  ORDER BY jr.created_at ASC;
$$;