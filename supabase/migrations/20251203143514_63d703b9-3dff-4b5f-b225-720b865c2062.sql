-- Fix 1: Restrict profiles UPDATE policy to prevent user_role modification
-- Drop the existing permissive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new restrictive update policy that only allows specific columns
-- Using a column-level approach with a trigger to prevent user_role changes
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing user_role once set
  IF OLD.user_role IS DISTINCT FROM NEW.user_role THEN
    RAISE EXCEPTION 'Changing user_role is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce the restriction
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- Recreate the update policy (trigger will enforce column restriction)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Fix 2: Make job-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'job-photos';