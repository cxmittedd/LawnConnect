-- Create a function that sends welcome email when user confirms their email
-- This is triggered by auth.users updates when email_confirmed_at changes from null to a value

-- First, create a function to send the welcome email via edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  request_body TEXT;
BEGIN
  -- Only proceed if email was just confirmed (email_confirmed_at changed from NULL to a value)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Get user profile data
    SELECT first_name, user_role INTO user_profile
    FROM public.profiles
    WHERE id = NEW.id;
    
    -- If profile exists, trigger the welcome email via edge function
    IF user_profile.first_name IS NOT NULL THEN
      -- Build the request body
      request_body := json_build_object(
        'email', NEW.email,
        'firstName', COALESCE(user_profile.first_name, 'User'),
        'userRole', COALESCE(user_profile.user_role, 'customer')
      )::TEXT;
      
      -- Call the edge function asynchronously using pg_net extension
      -- Note: This uses Supabase's pg_net extension for HTTP requests
      PERFORM net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
        ),
        body := request_body::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the confirmation
    RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;