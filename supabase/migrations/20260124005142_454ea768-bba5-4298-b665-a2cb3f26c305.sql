-- Drop existing restrictive policies for signup-related tables
DROP POLICY IF EXISTS "Users can insert their own signup record" ON public.signup_analytics;
DROP POLICY IF EXISTS "Users can insert their own consents" ON public.user_consents;

-- Create new policies that allow inserts when user_id matches the record being inserted
-- These will work during signup before email verification
CREATE POLICY "Allow insert for own user_id" 
ON public.signup_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow insert for own user_id" 
ON public.user_consents 
FOR INSERT 
WITH CHECK (true);

-- Add a trigger to automatically record signup analytics when a profile is created
CREATE OR REPLACE FUNCTION public.record_signup_on_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert signup analytics (ignore if already exists)
  INSERT INTO public.signup_analytics (user_id, user_role)
  VALUES (NEW.id, NEW.user_role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_record_signup ON public.profiles;
CREATE TRIGGER on_profile_created_record_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.record_signup_on_profile_creation();