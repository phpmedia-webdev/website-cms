-- Migration: Convert color schema from primary/secondary/alternate1-6 to color01-color15
-- Also adds colorLabels support
-- This migration preserves all existing color data by mapping old keys to new keys

-- Step 1: Migrate colors in settings table
UPDATE website_cms_template_dev.settings
SET value = (
  SELECT jsonb_build_object(
    'color01', COALESCE(value->>'primary', '#3b82f6'),
    'color02', COALESCE(value->>'secondary', '#8b5cf6'),
    'color03', COALESCE(value->>'accent', '#06b6d4'),
    'color04', COALESCE(value->>'background', '#ffffff'),
    'color05', COALESCE(value->>'backgroundAlt', '#f9fafb'),
    'color06', COALESCE(value->>'foreground', '#111827'),
    'color07', COALESCE(value->>'foregroundMuted', '#6b7280'),
    'color08', COALESCE(value->>'border', '#e5e7eb'),
    'color09', COALESCE(value->>'link', '#3b82f6'),
    'color10', COALESCE(value->>'alternate1', '#10b981'),
    'color11', COALESCE(value->>'alternate2', '#f59e0b'),
    'color12', COALESCE(value->>'alternate3', '#ef4444'),
    'color13', COALESCE(value->>'alternate4', '#3b82f6'),
    'color14', COALESCE(value->>'alternate5', '#2563eb'),
    'color15', COALESCE(value->>'alternate6', '#8b5a2b')
  )
)
WHERE key = 'design_system.colors'
  AND value IS NOT NULL
  AND (value ? 'primary' OR value ? 'color01') -- Only migrate if old format exists or not already migrated
  AND NOT (value ? 'color01'); -- Don't migrate if already in new format

-- Step 2: Add default colorLabels if they don't exist
INSERT INTO website_cms_template_dev.settings (key, value)
VALUES (
  'design_system.colorLabels',
  '{
    "color01": "Primary",
    "color02": "Secondary",
    "color03": "Accent",
    "color04": "Background",
    "color05": "Background Alt",
    "color06": "Foreground",
    "color07": "Foreground Muted",
    "color08": "Border",
    "color09": "Link",
    "color10": "Alternate 1",
    "color11": "Alternate 2",
    "color12": "Alternate 3",
    "color13": "Alternate 4",
    "color14": "Alternate 5",
    "color15": "Alternate 6"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Step 3: Migrate color_palettes table
UPDATE website_cms_template_dev.color_palettes
SET colors = (
  SELECT jsonb_build_object(
    'color01', COALESCE(colors->>'primary', '#3b82f6'),
    'color02', COALESCE(colors->>'secondary', '#8b5cf6'),
    'color03', COALESCE(colors->>'accent', '#06b6d4'),
    'color04', COALESCE(colors->>'background', '#ffffff'),
    'color05', COALESCE(colors->>'backgroundAlt', '#f9fafb'),
    'color06', COALESCE(colors->>'foreground', '#111827'),
    'color07', COALESCE(colors->>'foregroundMuted', '#6b7280'),
    'color08', COALESCE(colors->>'border', '#e5e7eb'),
    'color09', COALESCE(colors->>'link', '#3b82f6'),
    'color10', COALESCE(colors->>'alternate1', '#10b981'),
    'color11', COALESCE(colors->>'alternate2', '#f59e0b'),
    'color12', COALESCE(colors->>'alternate3', '#ef4444'),
    'color13', COALESCE(colors->>'alternate4', '#3b82f6'),
    'color14', COALESCE(colors->>'alternate5', '#2563eb'),
    'color15', COALESCE(colors->>'alternate6', '#8b5a2b')
  )
)
WHERE colors IS NOT NULL
  AND (colors ? 'primary' OR colors ? 'color01') -- Only migrate if old format exists
  AND NOT (colors ? 'color01'); -- Don't migrate if already in new format

-- Step 4: Verify migration
SELECT 
  'Settings migrated' as status,
  COUNT(*) FILTER (WHERE key = 'design_system.colors' AND value ? 'color01') as new_format_count,
  COUNT(*) FILTER (WHERE key = 'design_system.colors' AND value ? 'primary') as old_format_count
FROM website_cms_template_dev.settings;

SELECT 
  'Palettes migrated' as status,
  COUNT(*) FILTER (WHERE colors ? 'color01') as new_format_count,
  COUNT(*) FILTER (WHERE colors ? 'primary') as old_format_count
FROM website_cms_template_dev.color_palettes;
