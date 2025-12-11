-- Create a function to safely get profile data
-- Phone number and address are only returned for accepted job relationships
CREATE OR REPLACE FUNCTION public.get_profile_safe(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  phone_number text,
  address text,
  company_name text,
  user_role text,
  avatar_url text,
  bio text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_accepted_relationship boolean;
BEGIN
  -- Check if current user is the profile owner - return full profile
  IF auth.uid() = target_user_id THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.phone_number, p.address, 
           p.company_name, p.user_role, p.avatar_url, p.bio
    FROM profiles p WHERE p.id = target_user_id;
    RETURN;
  END IF;

  -- Check if there's an ACCEPTED job relationship (not just proposal)
  SELECT EXISTS (
    SELECT 1 FROM job_requests jr
    WHERE jr.status IN ('accepted', 'in_progress', 'completed')
    AND (
      (jr.customer_id = auth.uid() AND jr.accepted_provider_id = target_user_id)
      OR (jr.accepted_provider_id = auth.uid() AND jr.customer_id = target_user_id)
    )
  ) INTO has_accepted_relationship;

  IF has_accepted_relationship THEN
    -- Return full profile with PII for accepted relationships
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.phone_number, p.address, 
           p.company_name, p.user_role, p.avatar_url, p.bio
    FROM profiles p WHERE p.id = target_user_id;
  ELSE
    -- Return profile WITHOUT phone_number and address for non-accepted relationships
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, NULL::text as phone_number, NULL::text as address, 
           p.company_name, p.user_role, p.avatar_url, p.bio
    FROM profiles p WHERE p.id = target_user_id;
  END IF;
END;
$$;