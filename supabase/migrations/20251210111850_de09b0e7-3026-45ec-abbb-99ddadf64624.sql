-- Must drop function first to change return type
DROP FUNCTION IF EXISTS public.get_public_provider_profile(uuid);

-- Recreate function with first_name only for privacy
CREATE FUNCTION public.get_public_provider_profile(provider_id uuid)
RETURNS TABLE(id uuid, full_name text, first_name text, company_name text, avatar_url text, bio text, user_role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.first_name as full_name,
    p.first_name,
    p.company_name,
    p.avatar_url,
    p.bio,
    p.user_role
  FROM public.profiles p
  WHERE p.id = provider_id
    AND p.user_role IN ('provider', 'both');
$$;

-- Update view
DROP VIEW IF EXISTS public.provider_public_profiles;
CREATE VIEW public.provider_public_profiles AS
SELECT 
  id,
  first_name as full_name,
  first_name,
  company_name,
  avatar_url,
  bio,
  user_role
FROM public.profiles
WHERE user_role IN ('provider', 'both');

-- Update new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_full_name text;
BEGIN
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  
  IF v_first_name IS NULL AND v_full_name IS NOT NULL THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := CASE 
      WHEN POSITION(' ' IN v_full_name) > 0 
      THEN SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1)
      ELSE NULL 
    END;
  END IF;
  
  INSERT INTO public.profiles (id, full_name, first_name, last_name, user_role)
  VALUES (
    NEW.id,
    TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, '')),
    v_first_name,
    v_last_name,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'customer')
  );
  RETURN NEW;
END;
$$;