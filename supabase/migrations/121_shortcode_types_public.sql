-- File: 121_shortcode_types_public.sql
-- Public shortcode library: types available to all tenant sites. App code parses/renders; this table drives picker list and order.
-- Run in Supabase SQL Editor.

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.shortcode_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT,
  has_picker BOOLEAN NOT NULL DEFAULT true,
  picker_type TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.shortcode_types IS 'Shortcode type registry for universal picker; shared across tenants. Parse/render in app code.';

-- RLS: app uses service role to read; no direct anon/authenticated access needed
ALTER TABLE public.shortcode_types ENABLE ROW LEVEL SECURITY;

-- Policy: allow read for authenticated (editor) and anon (public render can fetch types if needed)
CREATE POLICY "Allow read shortcode_types"
  ON public.shortcode_types FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed Phase 1 types (idempotent: insert only if slug missing)
INSERT INTO public.shortcode_types (slug, label, icon, has_picker, picker_type, display_order)
VALUES
  ('gallery', 'Gallery', 'ImagePlus', true, 'gallery', 10),
  ('media', 'Image', 'Image', true, 'media', 20),
  ('separator', 'Separator', 'Minus', false, NULL, 30),
  ('section_break', 'Section break', 'Layout', false, NULL, 40),
  ('spacer', 'Spacer', 'Space', false, NULL, 50),
  ('clear', 'Clear', 'Eraser', false, NULL, 60),
  ('button', 'Button', 'MousePointer', true, 'button', 70),
  ('form', 'Form', 'FileInput', true, 'form', 80),
  ('snippet', 'Snippet', 'FileCode', true, 'snippet', 90)
ON CONFLICT (slug) DO NOTHING;
