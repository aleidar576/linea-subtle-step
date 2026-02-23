
-- Create platform enum for tracking pixels
CREATE TYPE public.tracking_platform AS ENUM ('facebook', 'tiktok');

-- Create tracking_pixels table
CREATE TABLE public.tracking_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform tracking_platform NOT NULL,
  pixel_id TEXT NOT NULL,
  access_token TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Anyone can read active pixels (needed by storefront)
CREATE POLICY "Anyone can read active tracking pixels"
ON public.tracking_pixels
FOR SELECT
USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins can read all tracking pixels"
ON public.tracking_pixels
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert tracking pixels"
ON public.tracking_pixels
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tracking pixels"
ON public.tracking_pixels
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tracking pixels"
ON public.tracking_pixels
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add global_head_scripts to settings (anon read policy)
-- We need an RLS policy for anon to read this setting
CREATE POLICY "Anon can read global head scripts"
ON public.settings
FOR SELECT
USING (key = 'global_head_scripts');
