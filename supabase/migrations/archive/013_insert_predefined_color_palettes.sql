-- Insert predefined color palettes
-- Popular palettes from Material Design, Tailwind, and other design systems
-- Note: Replace 'website_cms_template_dev' with your client schema name

INSERT INTO website_cms_template_dev.color_palettes (name, description, colors, is_predefined, tags) VALUES
-- Material Design
(
  'Material Design Blue',
  'Classic Material Design blue palette',
  '{
    "primary": "#2196F3",
    "secondary": "#FF9800",
    "accent": "#4CAF50",
    "background": "#FFFFFF",
    "backgroundAlt": "#F5F5F5",
    "foreground": "#212121",
    "foregroundMuted": "#757575",
    "border": "#E0E0E0",
    "link": "#2196F3",
    "alternate1": "#4CAF50",
    "alternate2": "#FF9800",
    "alternate3": "#F44336",
    "alternate4": "#9C27B0",
    "alternate5": "#00BCD4",
    "alternate6": "#795548"
  }'::jsonb,
  true,
  ARRAY['material', 'blue', 'professional']
),
-- Tailwind Default
(
  'Tailwind Default',
  'Default Tailwind CSS color palette',
  '{
    "primary": "#3B82F6",
    "secondary": "#8B5CF6",
    "accent": "#06B6D4",
    "background": "#FFFFFF",
    "backgroundAlt": "#F9FAFB",
    "foreground": "#111827",
    "foregroundMuted": "#6B7280",
    "border": "#E5E7EB",
    "link": "#3B82F6",
    "alternate1": "#10B981",
    "alternate2": "#F59E0B",
    "alternate3": "#EF4444",
    "alternate4": "#6366F1",
    "alternate5": "#EC4899",
    "alternate6": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'modern', 'versatile']
),
-- Dark Theme
(
  'Dark Theme',
  'Dark mode color palette',
  '{
    "primary": "#60A5FA",
    "secondary": "#A78BFA",
    "accent": "#34D399",
    "background": "#1F2937",
    "backgroundAlt": "#111827",
    "foreground": "#F9FAFB",
    "foregroundMuted": "#9CA3AF",
    "border": "#374151",
    "link": "#60A5FA",
    "alternate1": "#34D399",
    "alternate2": "#FBBF24",
    "alternate3": "#F87171",
    "alternate4": "#818CF8",
    "alternate5": "#F472B6",
    "alternate6": "#2DD4BF"
  }'::jsonb,
  true,
  ARRAY['dark', 'night', 'modern']
),
-- Vibrant
(
  'Vibrant',
  'Bold and vibrant color palette',
  '{
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4",
    "accent": "#FFE66D",
    "background": "#FFFFFF",
    "backgroundAlt": "#FFF5E6",
    "foreground": "#2C3E50",
    "foregroundMuted": "#7F8C8D",
    "border": "#BDC3C7",
    "link": "#FF6B6B",
    "alternate1": "#4ECDC4",
    "alternate2": "#FFE66D",
    "alternate3": "#FF6B6B",
    "alternate4": "#A8E6CF",
    "alternate5": "#FFD93D",
    "alternate6": "#6BCB77"
  }'::jsonb,
  true,
  ARRAY['vibrant', 'bold', 'energetic']
),
-- Minimal
(
  'Minimal',
  'Clean and minimal color palette',
  '{
    "primary": "#2C3E50",
    "secondary": "#34495E",
    "accent": "#E74C3C",
    "background": "#FFFFFF",
    "backgroundAlt": "#F8F9FA",
    "foreground": "#2C3E50",
    "foregroundMuted": "#95A5A6",
    "border": "#ECF0F1",
    "link": "#3498DB",
    "alternate1": "#E74C3C",
    "alternate2": "#F39C12",
    "alternate3": "#27AE60",
    "alternate4": "#9B59B6",
    "alternate5": "#1ABC9C",
    "alternate6": "#34495E"
  }'::jsonb,
  true,
  ARRAY['minimal', 'clean', 'simple']
),
-- Ocean
(
  'Ocean',
  'Cool ocean-inspired palette',
  '{
    "primary": "#0077BE",
    "secondary": "#00A8CC",
    "accent": "#0ABDE3",
    "background": "#FFFFFF",
    "backgroundAlt": "#F0F8FF",
    "foreground": "#1A1A2E",
    "foregroundMuted": "#6C757D",
    "border": "#D1ECF1",
    "link": "#0077BE",
    "alternate1": "#0ABDE3",
    "alternate2": "#54A0FF",
    "alternate3": "#5F27CD",
    "alternate4": "#00D2D3",
    "alternate5": "#00D2D3",
    "alternate6": "#2E86AB"
  }'::jsonb,
  true,
  ARRAY['ocean', 'cool', 'calm']
),
-- Forest
(
  'Forest',
  'Natural green forest palette',
  '{
    "primary": "#2D5016",
    "secondary": "#3E7B27",
    "accent": "#6B8E23",
    "background": "#FFFFFF",
    "backgroundAlt": "#F5F5DC",
    "foreground": "#1A1A1A",
    "foregroundMuted": "#556B2F",
    "border": "#D3D3D3",
    "link": "#228B22",
    "alternate1": "#6B8E23",
    "alternate2": "#9ACD32",
    "alternate3": "#8FBC8F",
    "alternate4": "#3CB371",
    "alternate5": "#2E8B57",
    "alternate6": "#228B22"
  }'::jsonb,
  true,
  ARRAY['forest', 'green', 'natural']
),
-- Sunset
(
  'Sunset',
  'Warm sunset-inspired palette',
  '{
    "primary": "#FF6B35",
    "secondary": "#F7931E",
    "accent": "#FFD23F",
    "background": "#FFFFFF",
    "backgroundAlt": "#FFF8E7",
    "foreground": "#2C1810",
    "foregroundMuted": "#8B6F47",
    "border": "#E8D5B7",
    "link": "#FF6B35",
    "alternate1": "#FFD23F",
    "alternate2": "#F7931E",
    "alternate3": "#FF6B35",
    "alternate4": "#FF8C42",
    "alternate5": "#FFA07A",
    "alternate6": "#FF7F50"
  }'::jsonb,
  true,
  ARRAY['sunset', 'warm', 'orange']
)
ON CONFLICT DO NOTHING;
