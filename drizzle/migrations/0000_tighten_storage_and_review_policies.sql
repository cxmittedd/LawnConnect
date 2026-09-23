-- reviews: remove blanket "any signed-in user" read rule.
-- Provider reviews stay publicly readable and participants keep access via existing policies.
DROP POLICY IF EXISTS "Require authentication to view reviews" ON public.reviews;

-- id-documents: this policy granted nothing (USING ... AND false) but registered as an
-- unbound anon SELECT rule. Deny-by-default already blocks anon reads.
DROP POLICY IF EXISTS "No public access to ID documents" ON storage.objects;

-- avatars: bind listing/reads to the owning user's folder (images are still served
-- through public bucket URLs, so display is unaffected).
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Users can view their own avatar files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- assets: restrict listing and uploads to admins (public URLs still serve the files).
DROP POLICY IF EXISTS "Public read access for assets" ON storage.objects;
CREATE POLICY "Admins can view asset files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
CREATE POLICY "Admins can upload assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));

-- job-photos: bind uploads to the uploader's own folder (app uploads to <user_id>/<job_id>/...).
DROP POLICY IF EXISTS "Authenticated users can upload job photos" ON storage.objects;
CREATE POLICY "Users can upload job photos to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-photos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);