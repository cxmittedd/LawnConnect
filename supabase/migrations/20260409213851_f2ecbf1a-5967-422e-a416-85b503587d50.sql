
CREATE OR REPLACE FUNCTION public.get_customer_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  found_id uuid;
BEGIN
  -- Only admins can use this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO found_id
  FROM auth.users
  WHERE email = email_input
  LIMIT 1;

  RETURN found_id;
END;
$$;
