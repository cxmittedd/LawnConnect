-- Update handle_new_user function to include phone_number from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_phone_number text;
BEGIN
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_phone_number := NEW.raw_user_meta_data->>'phone_number';
  
  IF v_first_name IS NULL AND v_full_name IS NOT NULL THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := CASE 
      WHEN POSITION(' ' IN v_full_name) > 0 
      THEN SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1)
      ELSE NULL 
    END;
  END IF;
  
  INSERT INTO public.profiles (id, full_name, first_name, last_name, phone_number, user_role)
  VALUES (
    NEW.id,
    TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, '')),
    v_first_name,
    v_last_name,
    v_phone_number,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'customer')
  );
  RETURN NEW;
END;
$function$;