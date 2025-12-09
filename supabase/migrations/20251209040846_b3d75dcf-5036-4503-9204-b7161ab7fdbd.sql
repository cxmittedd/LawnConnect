-- Require authentication to view reviews (prevent scraping)
CREATE POLICY "Require authentication to view reviews" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Drop the comment column from reviews table
ALTER TABLE public.reviews DROP COLUMN IF EXISTS comment;