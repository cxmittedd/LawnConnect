-- Allow viewing profiles of providers/both role users publicly
CREATE POLICY "Anyone can view provider profiles" 
ON public.profiles 
FOR SELECT 
USING (user_role IN ('provider', 'both'));