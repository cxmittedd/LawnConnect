
-- Fix 1: Drop the overly permissive profiles SELECT policy
-- The specific relationship-based policies already handle proper access control
DROP POLICY IF EXISTS "Require authentication for profiles access" ON public.profiles;

-- Fix 2: Add server-side validation to storage buckets missing constraints

-- completion-photos: add file size limit and allowed MIME types
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
WHERE id = 'completion-photos';

-- id-documents: add file size limit and allowed MIME types
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'id-documents';

-- avatars: add allowed MIME types (may already have size limit)
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';
