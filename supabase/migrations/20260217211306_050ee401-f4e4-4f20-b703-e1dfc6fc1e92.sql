-- Allow anon to read all homepage-related settings
CREATE POLICY "Anon can read homepage settings"
ON public.settings
FOR SELECT
USING (key IN ('homepage_banners', 'homepage_reviews', 'homepage_cta', 'homepage_top_bar', 'upsell_config'));