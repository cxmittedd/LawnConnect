-- Fix SECURITY DEFINER functions with proper authorization checks

-- 1. Fix get_provider_job_listings - require caller to be a provider
CREATE OR REPLACE FUNCTION public.get_provider_job_listings()
 RETURNS TABLE(id uuid, title text, parish text, location text, description text, lawn_size text, preferred_date date, preferred_time text, additional_requirements text, base_price numeric, customer_offer numeric, status text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    jr.customer_offer,
    jr.status,
    jr.created_at
  FROM job_requests jr
  WHERE jr.status IN ('open', 'in_negotiation')
    AND jr.accepted_provider_id IS NULL
    AND jr.payment_status = 'paid'
    AND is_provider(auth.uid()) -- Only allow providers to view job listings
  ORDER BY jr.created_at ASC;
$function$;

-- 2. Fix get_provider_disputes_this_month - require caller to be owner or admin
CREATE OR REPLACE FUNCTION public.get_provider_disputes_this_month(provider_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: only the provider themselves or admin can view
  IF auth.uid() != provider_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized access to provider statistics';
  END IF;

  RETURN (
    SELECT COUNT(*)::integer
    FROM job_disputes jd
    JOIN job_requests jr ON jr.id = jd.job_id
    WHERE jr.accepted_provider_id = provider_id
      AND jd.created_at >= date_trunc('month', CURRENT_DATE)
      AND jd.created_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
  );
END;
$function$;

-- 3. Fix get_provider_late_jobs_this_month - require caller to be owner or admin
CREATE OR REPLACE FUNCTION public.get_provider_late_jobs_this_month(provider_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: only the provider themselves or admin can view
  IF auth.uid() != provider_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized access to provider statistics';
  END IF;

  RETURN (
    SELECT COUNT(*)::integer
    FROM job_requests
    WHERE accepted_provider_id = provider_id
      AND is_late_completion = true
      AND provider_completed_at >= date_trunc('month', CURRENT_DATE)
      AND provider_completed_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
  );
END;
$function$;
