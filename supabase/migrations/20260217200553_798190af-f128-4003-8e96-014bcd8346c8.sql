
-- Create a settings table for admin-configurable settings
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
ON public.settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
ON public.settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow edge functions to read settings (anon for service calls)
CREATE POLICY "Anon can read sealpay settings"
ON public.settings FOR SELECT
USING (key LIKE 'sealpay_%');

-- Seed the default SealPay URL
INSERT INTO public.settings (key, value) VALUES
  ('sealpay_api_url', 'https://abacate-5eo1.onrender.com/create-pix');
