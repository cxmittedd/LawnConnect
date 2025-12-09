-- Drop the existing function first since we're changing return type
DROP FUNCTION IF EXISTS public.get_provider_job_listings();

-- Recreate without location field for privacy
CREATE FUNCTION public.get_provider_job_listings()
RETURNS TABLE(
  id uuid, 
  title text, 
  parish text, 
  description text, 
  lawn_size text, 
  preferred_date date, 
  preferred_time text, 
  additional_requirements text, 
  base_price numeric, 
  customer_offer numeric, 
  status text, 
  created_at timestamp with time zone
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
    jr.description,
    jr.lawn_size,
    jr.preferred_date,
    jr.preferred_time,
    jr.additional_requirements,
    jr.base_price,
    jr.customer_offer,
    jr.status,
    jr.created_at
  FROM job_requests jr
  WHERE jr.status IN ('open', 'in_negotiation')
  ORDER BY jr.created_at DESC;
$$;