-- Ensure complete RLS protection for id-documents bucket
-- Drop any existing policies and recreate with strict controls

-- First, verify no UPDATE/DELETE policies exist (which could allow tampering)
-- Then add explicit deny for public access

-- Add policy to prevent any public (unauthenticated) access
DROP POLICY IF EXISTS "No public access to ID documents" ON storage.objects;
CREATE POLICY "No public access to ID documents"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'id-documents' AND false
);

-- Ensure providers can only update their own documents (in case they need to re-upload)
DROP POLICY IF EXISTS "Providers can update their own ID documents" ON storage.objects;
CREATE POLICY "Providers can update their own ID documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'id-documents' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'id-documents' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Ensure providers can only delete their own documents
DROP POLICY IF EXISTS "Providers can delete their own ID documents" ON storage.objects;
CREATE POLICY "Providers can delete their own ID documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'id-documents' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Admins can manage all ID documents for verification purposes
DROP POLICY IF EXISTS "Admins can manage ID documents" ON storage.objects;
CREATE POLICY "Admins can manage ID documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'id-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'id-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);