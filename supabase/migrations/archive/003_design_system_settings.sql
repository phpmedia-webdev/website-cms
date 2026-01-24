-- Migration: Add design system default settings
-- This migration adds default design system values to the settings table
-- Run this in Supabase SQL Editor in the context of your client schema

-- Note: This migration assumes the settings table already exists
-- It uses the schema from NEXT_PUBLIC_CLIENT_SCHEMA environment variable
-- For this migration, replace 'website_cms_template_dev' with your actual schema name

-- Set search_path to the client schema
-- Replace 'website_cms_template_dev' with your actual schema name
SET search_path TO website_cms_template_dev, public;

-- Insert default design system settings
-- These will be used if no custom values are set

-- Theme selection (default: 'default')
INSERT INTO website_cms_template_dev.settings (key, value) 
VALUES ('design_system.theme', '"default"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Primary font (default: Inter - Google Fonts)
INSERT INTO website_cms_template_dev.settings (key, value) 
VALUES ('design_system.fonts.primary', '{"family": "Inter", "source": "google", "weights": [400, 500, 600, 700]}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Secondary font (default: Inter - same as primary, can be changed)
INSERT INTO website_cms_template_dev.settings (key, value) 
VALUES ('design_system.fonts.secondary', '{"family": "Inter", "source": "google", "weights": [400, 500, 600]}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Color palette (default: modern blue/purple theme)
INSERT INTO website_cms_template_dev.settings (key, value) 
VALUES ('design_system.colors', '{
  "primary": "#3b82f6",
  "secondary": "#8b5cf6",
  "accent": "#06b6d4",
  "background": "#ffffff",
  "backgroundAlt": "#f9fafb",
  "foreground": "#111827",
  "foregroundMuted": "#6b7280",
  "border": "#e5e7eb",
  "link": "#3b82f6",
  "linkHover": "#2563eb",
  "success": "#10b981",
  "warning": "#f59e0b",
  "error": "#ef4444",
  "info": "#3b82f6"
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Site metadata (for use in public pages)
INSERT INTO website_cms_template_dev.settings (key, value) 
VALUES ('site.name', '"Website CMS"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO website_cms_template_dev.settings (key, value) 
VALUES ('site.description', '""')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Verify settings were inserted
SELECT key, value 
FROM website_cms_template_dev.settings 
WHERE key LIKE 'design_system.%' OR key LIKE 'site.%'
ORDER BY key;
