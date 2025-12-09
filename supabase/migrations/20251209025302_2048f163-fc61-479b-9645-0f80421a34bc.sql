-- Add bio field for provider descriptions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.bio IS 'Provider self-description/bio for their public profile';