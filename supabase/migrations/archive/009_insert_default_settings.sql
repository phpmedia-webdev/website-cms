-- Insert default design system settings if they don't exist
-- This ensures the settings table has data to query

INSERT INTO website_cms_template_dev.settings (key, value)
VALUES 
  ('design_system.theme', '"default"'::jsonb),
  ('design_system.fonts.primary', '{"family": "Inter", "weights": [400, 500, 600, 700], "source": "google"}'::jsonb),
  ('design_system.fonts.secondary', '{"family": "Inter", "weights": [400, 500, 600], "source": "google"}'::jsonb),
  ('design_system.colors', '{"primary": "#3b82f6", "secondary": "#8b5cf6", "accent": "#10b981", "background": "#ffffff", "foreground": "#1f2937", "muted": "#f3f4f6", "mutedForeground": "#6b7280", "border": "#e5e7eb"}'::jsonb),
  ('site.name', '"Website CMS"'::jsonb),
  ('site.description', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Verify the data was inserted
SELECT key, value FROM website_cms_template_dev.settings ORDER BY key;
