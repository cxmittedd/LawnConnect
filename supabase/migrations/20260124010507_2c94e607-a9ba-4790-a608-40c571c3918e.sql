-- Add unique constraint on user_id for signup_analytics to support ON CONFLICT
ALTER TABLE public.signup_analytics ADD CONSTRAINT signup_analytics_user_id_key UNIQUE (user_id);

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.record_signup_on_profile_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert signup analytics (ignore if already exists)
  INSERT INTO public.signup_analytics (user_id, user_role)
  VALUES (NEW.id, NEW.user_role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Failed to record signup analytics for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;