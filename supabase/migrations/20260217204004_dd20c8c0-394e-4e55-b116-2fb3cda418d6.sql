-- Allow anonymous read of homepage_extras setting
CREATE POLICY "Anon can read homepage extras" 
ON public.settings 
FOR SELECT 
USING (key = 'homepage_extras');