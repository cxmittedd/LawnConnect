-- Create a public assets bucket for email templates and branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to assets
CREATE POLICY "Public read access for assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assets');

-- Allow authenticated users to upload assets (admin only in practice)
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'assets' AND auth.role() = 'authenticated');