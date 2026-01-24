-- Insert grouped color palettes (5-6 groups, 8-15 palettes each)
-- All palettes use color01-color15 schema
-- Palettes with <15 colors will be filled with variations in the application layer
-- Note: Replace 'website_cms_template_dev' with your client schema name

-- Helper function to lighten a hex color
CREATE OR REPLACE FUNCTION lighten_color(hex_color TEXT, percent INTEGER DEFAULT 20)
RETURNS TEXT AS $$
DECLARE
  r INTEGER;
  g INTEGER;
  b INTEGER;
  clean_hex TEXT;
  full_hex TEXT;
BEGIN
  clean_hex := REPLACE(hex_color, '#', '');
  full_hex := CASE 
    WHEN LENGTH(clean_hex) = 3 THEN 
      SUBSTRING(clean_hex, 1, 1) || SUBSTRING(clean_hex, 1, 1) ||
      SUBSTRING(clean_hex, 2, 1) || SUBSTRING(clean_hex, 2, 1) ||
      SUBSTRING(clean_hex, 3, 1) || SUBSTRING(clean_hex, 3, 1)
    ELSE clean_hex
  END;
  
  r := ('x' || SUBSTRING(full_hex, 1, 2))::bit(8)::INTEGER;
  g := ('x' || SUBSTRING(full_hex, 3, 2))::bit(8)::INTEGER;
  b := ('x' || SUBSTRING(full_hex, 5, 2))::bit(8)::INTEGER;
  
  r := LEAST(255, r + (255 - r) * percent / 100);
  g := LEAST(255, g + (255 - g) * percent / 100);
  b := LEAST(255, b + (255 - b) * percent / 100);
  
  RETURN '#' || LPAD(TO_HEX(r), 2, '0') || LPAD(TO_HEX(g), 2, '0') || LPAD(TO_HEX(b), 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to darken a hex color
CREATE OR REPLACE FUNCTION darken_color(hex_color TEXT, percent INTEGER DEFAULT 20)
RETURNS TEXT AS $$
DECLARE
  r INTEGER;
  g INTEGER;
  b INTEGER;
  clean_hex TEXT;
  full_hex TEXT;
BEGIN
  clean_hex := REPLACE(hex_color, '#', '');
  full_hex := CASE 
    WHEN LENGTH(clean_hex) = 3 THEN 
      SUBSTRING(clean_hex, 1, 1) || SUBSTRING(clean_hex, 1, 1) ||
      SUBSTRING(clean_hex, 2, 1) || SUBSTRING(clean_hex, 2, 1) ||
      SUBSTRING(clean_hex, 3, 1) || SUBSTRING(clean_hex, 3, 1)
    ELSE clean_hex
  END;
  
  r := ('x' || SUBSTRING(full_hex, 1, 2))::bit(8)::INTEGER;
  g := ('x' || SUBSTRING(full_hex, 3, 2))::bit(8)::INTEGER;
  b := ('x' || SUBSTRING(full_hex, 5, 2))::bit(8)::INTEGER;
  
  r := GREATEST(0, r - r * percent / 100);
  g := GREATEST(0, g - g * percent / 100);
  b := GREATEST(0, b - b * percent / 100);
  
  RETURN '#' || LPAD(TO_HEX(r), 2, '0') || LPAD(TO_HEX(g), 2, '0') || LPAD(TO_HEX(b), 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Delete old predefined palettes (they use old schema)
-- This is safe because:
-- 1. Old palettes use the deprecated primary/secondary/alternate1-6 schema
-- 2. New grouped palettes (56 total) will replace them with color01-color15 schema
-- 3. Custom palettes (is_predefined = false) are NOT affected
-- Only run this if you want to replace old predefined palettes with new grouped ones
DO $$
DECLARE
  old_palette_count INTEGER;
BEGIN
  -- Count old predefined palettes
  SELECT COUNT(*) INTO old_palette_count
  FROM website_cms_template_dev.color_palettes
  WHERE is_predefined = true;
  
  -- Only delete if old palettes exist
  IF old_palette_count > 0 THEN
    DELETE FROM website_cms_template_dev.color_palettes WHERE is_predefined = true;
    RAISE NOTICE 'Deleted % old predefined palette(s). New grouped palettes will be inserted.', old_palette_count;
  ELSE
    RAISE NOTICE 'No old predefined palettes found. Proceeding with new palette insertion.';
  END IF;
END $$;

-- Group 1: Professional & Corporate (10 palettes)
INSERT INTO website_cms_template_dev.color_palettes (name, description, colors, is_predefined, tags) VALUES
(
  'Corporate Blue',
  'Professional blue palette for business websites',
  '{
    "color01": "#1E40AF",
    "color02": "#3B82F6",
    "color03": "#60A5FA",
    "color04": "#FFFFFF",
    "color05": "#F8FAFC",
    "color06": "#0F172A",
    "color07": "#64748B",
    "color08": "#E2E8F0",
    "color09": "#1E40AF",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#8B5CF6",
    "color15": "#475569"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'business']
),
(
  'Executive Gray',
  'Sophisticated gray palette for executive presence',
  '{
    "color01": "#1F2937",
    "color02": "#374151",
    "color03": "#4B5563",
    "color04": "#FFFFFF",
    "color05": "#F9FAFB",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#1F2937",
    "color10": "#059669",
    "color11": "#D97706",
    "color12": "#DC2626",
    "color13": "#2563EB",
    "color14": "#7C3AED",
    "color15": "#9CA3AF"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'gray']
),
(
  'Navy & Gold',
  'Classic navy and gold professional palette',
  '{
    "color01": "#1E3A8A",
    "color02": "#F59E0B",
    "color03": "#FBBF24",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#1E293B",
    "color07": "#64748B",
    "color08": "#E2E8F0",
    "color09": "#1E3A8A",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#78350F"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'navy', 'gold']
),
(
  'Business Green',
  'Professional green palette for finance and growth',
  '{
    "color01": "#065F46",
    "color02": "#059669",
    "color03": "#10B981",
    "color04": "#FFFFFF",
    "color05": "#F0FDF4",
    "color06": "#064E3B",
    "color07": "#6B7280",
    "color08": "#D1D5DB",
    "color09": "#065F46",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#34D399"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'green', 'finance']
),
(
  'Professional Black',
  'High-contrast black and white professional palette',
  '{
    "color01": "#000000",
    "color02": "#1F2937",
    "color03": "#3B82F6",
    "color04": "#FFFFFF",
    "color05": "#F9FAFB",
    "color06": "#000000",
    "color07": "#4B5563",
    "color08": "#E5E7EB",
    "color09": "#000000",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#6B7280"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'black', 'minimal']
),
(
  'Trust Blue',
  'Calming blue palette for trust and reliability',
  '{
    "color01": "#1E40AF",
    "color02": "#3B82F6",
    "color03": "#60A5FA",
    "color04": "#FFFFFF",
    "color05": "#EFF6FF",
    "color06": "#1E293B",
    "color07": "#64748B",
    "color08": "#CBD5E1",
    "color09": "#1E40AF",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#8B5CF6",
    "color15": "#0EA5E9"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'blue', 'trust']
),
(
  'Corporate Red',
  'Bold red palette for energy and action',
  '{
    "color01": "#991B1B",
    "color02": "#DC2626",
    "color03": "#EF4444",
    "color04": "#FFFFFF",
    "color05": "#FEF2F2",
    "color06": "#1F2937",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#DC2626",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#DC2626",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#7F1D1D"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'red', 'energy']
),
(
  'Slate Professional',
  'Modern slate palette for tech companies',
  '{
    "color01": "#0F172A",
    "color02": "#1E293B",
    "color03": "#334155",
    "color04": "#FFFFFF",
    "color05": "#F8FAFC",
    "color06": "#0F172A",
    "color07": "#64748B",
    "color08": "#CBD5E1",
    "color09": "#0F172A",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#475569"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'slate', 'tech']
),
(
  'Ivory & Charcoal',
  'Elegant ivory and charcoal professional palette',
  '{
    "color01": "#1F2937",
    "color02": "#374151",
    "color03": "#4B5563",
    "color04": "#FFFBEB",
    "color05": "#FEF3C7",
    "color06": "#1F2937",
    "color07": "#6B7280",
    "color08": "#D1D5DB",
    "color09": "#1F2937",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#9CA3AF"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'ivory', 'charcoal']
),
(
  'Modern Teal',
  'Contemporary teal palette for modern businesses',
  '{
    "color01": "#0F766E",
    "color02": "#14B8A6",
    "color03": "#5EEAD4",
    "color04": "#FFFFFF",
    "color05": "#F0FDFA",
    "color06": "#0F172A",
    "color07": "#64748B",
    "color08": "#E2E8F0",
    "color09": "#0F766E",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#2DD4BF"
  }'::jsonb,
  true,
  ARRAY['professional', 'corporate', 'teal', 'modern']
),

-- Group 2: Material Design (8 palettes)
(
  'Material Blue',
  'Classic Material Design blue palette',
  '{
    "color01": "#2196F3",
    "color02": "#FF9800",
    "color03": "#4CAF50",
    "color04": "#FFFFFF",
    "color05": "#F5F5F5",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#2196F3",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#795548"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'blue']
),
(
  'Material Indigo',
  'Material Design indigo palette',
  '{
    "color01": "#3F51B5",
    "color02": "#E91E63",
    "color03": "#00BCD4",
    "color04": "#FFFFFF",
    "color05": "#F5F5F5",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#3F51B5",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#607D8B"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'indigo']
),
(
  'Material Teal',
  'Material Design teal palette',
  '{
    "color01": "#009688",
    "color02": "#FF5722",
    "color03": "#FFC107",
    "color04": "#FFFFFF",
    "color05": "#F5F5F5",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#009688",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#795548"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'teal']
),
(
  'Material Amber',
  'Material Design amber palette',
  '{
    "color01": "#FF9800",
    "color02": "#E91E63",
    "color03": "#4CAF50",
    "color04": "#FFFFFF",
    "color05": "#FFF8E1",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#FF9800",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#FFC107"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'amber']
),
(
  'Material Purple',
  'Material Design purple palette',
  '{
    "color01": "#9C27B0",
    "color02": "#E91E63",
    "color03": "#00BCD4",
    "color04": "#FFFFFF",
    "color05": "#F3E5F5",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#9C27B0",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#7B1FA2"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'purple']
),
(
  'Material Green',
  'Material Design green palette',
  '{
    "color01": "#4CAF50",
    "color02": "#FF9800",
    "color03": "#2196F3",
    "color04": "#FFFFFF",
    "color05": "#E8F5E9",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#4CAF50",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#388E3C"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'green']
),
(
  'Material Red',
  'Material Design red palette',
  '{
    "color01": "#F44336",
    "color02": "#FF9800",
    "color03": "#4CAF50",
    "color04": "#FFFFFF",
    "color05": "#FFEBEE",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#F44336",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#D32F2F"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'red']
),
(
  'Material Pink',
  'Material Design pink palette',
  '{
    "color01": "#E91E63",
    "color02": "#2196F3",
    "color03": "#4CAF50",
    "color04": "#FFFFFF",
    "color05": "#FCE4EC",
    "color06": "#212121",
    "color07": "#757575",
    "color08": "#E0E0E0",
    "color09": "#E91E63",
    "color10": "#4CAF50",
    "color11": "#FF9800",
    "color12": "#F44336",
    "color13": "#9C27B0",
    "color14": "#00BCD4",
    "color15": "#C2185B"
  }'::jsonb,
  true,
  ARRAY['material-design', 'material', 'pink']
),

-- Group 3: Tailwind Defaults (8 palettes)
(
  'Tailwind Blue',
  'Tailwind CSS blue palette',
  '{
    "color01": "#3B82F6",
    "color02": "#8B5CF6",
    "color03": "#06B6D4",
    "color04": "#FFFFFF",
    "color05": "#F9FAFB",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#3B82F6",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'blue']
),
(
  'Tailwind Purple',
  'Tailwind CSS purple palette',
  '{
    "color01": "#8B5CF6",
    "color02": "#3B82F6",
    "color03": "#06B6D4",
    "color04": "#FFFFFF",
    "color05": "#FAF5FF",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#8B5CF6",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#A855F7"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'purple']
),
(
  'Tailwind Green',
  'Tailwind CSS green palette',
  '{
    "color01": "#10B981",
    "color02": "#3B82F6",
    "color03": "#06B6D4",
    "color04": "#FFFFFF",
    "color05": "#F0FDF4",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#10B981",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#059669"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'green']
),
(
  'Tailwind Rose',
  'Tailwind CSS rose palette',
  '{
    "color01": "#F43F5E",
    "color02": "#3B82F6",
    "color03": "#06B6D4",
    "color04": "#FFFFFF",
    "color05": "#FFF1F2",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#F43F5E",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#E11D48"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'rose']
),
(
  'Tailwind Orange',
  'Tailwind CSS orange palette',
  '{
    "color01": "#F97316",
    "color02": "#3B82F6",
    "color03": "#06B6D4",
    "color04": "#FFFFFF",
    "color05": "#FFF7ED",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#F97316",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#EA580C"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'orange']
),
(
  'Tailwind Cyan',
  'Tailwind CSS cyan palette',
  '{
    "color01": "#06B6D4",
    "color02": "#3B82F6",
    "color03": "#8B5CF6",
    "color04": "#FFFFFF",
    "color05": "#ECFEFF",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#06B6D4",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#0891B2"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'cyan']
),
(
  'Tailwind Indigo',
  'Tailwind CSS indigo palette',
  '{
    "color01": "#6366F1",
    "color02": "#3B82F6",
    "color03": "#06B6D4",
    "color04": "#FFFFFF",
    "color05": "#EEF2FF",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#6366F1",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#4F46E5"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'indigo']
),
(
  'Tailwind Emerald',
  'Tailwind CSS emerald palette',
  '{
    "color01": "#10B981",
    "color02": "#06B6D4",
    "color03": "#3B82F6",
    "color04": "#FFFFFF",
    "color05": "#ECFDF5",
    "color06": "#111827",
    "color07": "#6B7280",
    "color08": "#E5E7EB",
    "color09": "#10B981",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#6366F1",
    "color14": "#EC4899",
    "color15": "#059669"
  }'::jsonb,
  true,
  ARRAY['tailwind', 'tailwind-defaults', 'emerald']
),

-- Group 4: Pastels & Soft (10 palettes)
(
  'Soft Lavender',
  'Gentle lavender pastel palette',
  '{
    "color01": "#C4B5FD",
    "color02": "#DDD6FE",
    "color03": "#EDE9FE",
    "color04": "#FFFFFF",
    "color05": "#FAF5FF",
    "color06": "#4C1D95",
    "color07": "#7C3AED",
    "color08": "#E9D5FF",
    "color09": "#A78BFA",
    "color10": "#C4B5FD",
    "color11": "#FBCFE8",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#D1FAE5"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'lavender']
),
(
  'Mint Dream',
  'Fresh mint pastel palette',
  '{
    "color01": "#6EE7B7",
    "color02": "#A7F3D0",
    "color03": "#D1FAE5",
    "color04": "#FFFFFF",
    "color05": "#ECFDF5",
    "color06": "#065F46",
    "color07": "#059669",
    "color08": "#D1FAE5",
    "color09": "#10B981",
    "color10": "#6EE7B7",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'mint']
),
(
  'Peach Blush',
  'Warm peach pastel palette',
  '{
    "color01": "#FBCFE8",
    "color02": "#FCE7F3",
    "color03": "#FDF2F8",
    "color04": "#FFFFFF",
    "color05": "#FFF1F2",
    "color06": "#831843",
    "color07": "#BE185D",
    "color08": "#FCE7F3",
    "color09": "#EC4899",
    "color10": "#FBCFE8",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'peach']
),
(
  'Sky Blue',
  'Soft sky blue pastel palette',
  '{
    "color01": "#93C5FD",
    "color02": "#BFDBFE",
    "color03": "#DBEAFE",
    "color04": "#FFFFFF",
    "color05": "#EFF6FF",
    "color06": "#1E3A8A",
    "color07": "#3B82F6",
    "color08": "#DBEAFE",
    "color09": "#60A5FA",
    "color10": "#93C5FD",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'blue', 'sky']
),
(
  'Rose Gold',
  'Elegant rose gold pastel palette',
  '{
    "color01": "#F9A8D4",
    "color02": "#FBCFE8",
    "color03": "#FCE7F3",
    "color04": "#FFFFFF",
    "color05": "#FFF1F2",
    "color06": "#831843",
    "color07": "#BE185D",
    "color08": "#FCE7F3",
    "color09": "#EC4899",
    "color10": "#F9A8D4",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'rose', 'gold']
),
(
  'Lemon Cream',
  'Bright lemon cream pastel palette',
  '{
    "color01": "#FDE68A",
    "color02": "#FEF3C7",
    "color03": "#FFFBEB",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#D97706",
    "color08": "#FEF3C7",
    "color09": "#F59E0B",
    "color10": "#FDE68A",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'yellow', 'lemon']
),
(
  'Lilac Mist',
  'Delicate lilac pastel palette',
  '{
    "color01": "#C4B5FD",
    "color02": "#DDD6FE",
    "color03": "#EDE9FE",
    "color04": "#FFFFFF",
    "color05": "#FAF5FF",
    "color06": "#4C1D95",
    "color07": "#7C3AED",
    "color08": "#EDE9FE",
    "color09": "#A78BFA",
    "color10": "#C4B5FD",
    "color11": "#FBCFE8",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#D1FAE5"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'lilac', 'purple']
),
(
  'Powder Pink',
  'Soft powder pink pastel palette',
  '{
    "color01": "#FBCFE8",
    "color02": "#FCE7F3",
    "color03": "#FDF2F8",
    "color04": "#FFFFFF",
    "color05": "#FFF1F2",
    "color06": "#831843",
    "color07": "#BE185D",
    "color08": "#FDF2F8",
    "color09": "#EC4899",
    "color10": "#FBCFE8",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'pink']
),
(
  'Sage Green',
  'Calming sage green pastel palette',
  '{
    "color01": "#A7F3D0",
    "color02": "#D1FAE5",
    "color03": "#ECFDF5",
    "color04": "#FFFFFF",
    "color05": "#F0FDF4",
    "color06": "#065F46",
    "color07": "#059669",
    "color08": "#D1FAE5",
    "color09": "#10B981",
    "color10": "#6EE7B7",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'sage', 'green']
),
(
  'Buttercream',
  'Warm buttercream pastel palette',
  '{
    "color01": "#FEF3C7",
    "color02": "#FFFBEB",
    "color03": "#FFFBEB",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#D97706",
    "color08": "#FEF3C7",
    "color09": "#F59E0B",
    "color10": "#FDE68A",
    "color11": "#FDE68A",
    "color12": "#FCA5A5",
    "color13": "#BFDBFE",
    "color14": "#A5F3FC",
    "color15": "#C4B5FD"
  }'::jsonb,
  true,
  ARRAY['pastels', 'soft', 'yellow', 'cream']
),

-- Group 5: Cool Tones (10 palettes)
(
  'Arctic Blue',
  'Cool arctic blue palette',
  '{
    "color01": "#0EA5E9",
    "color02": "#38BDF8",
    "color03": "#7DD3FC",
    "color04": "#FFFFFF",
    "color05": "#F0F9FF",
    "color06": "#0C4A6E",
    "color07": "#075985",
    "color08": "#BAE6FD",
    "color09": "#0284C7",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'blue', 'arctic']
),
(
  'Deep Ocean',
  'Rich deep ocean blue palette',
  '{
    "color01": "#0369A1",
    "color02": "#0EA5E9",
    "color03": "#38BDF8",
    "color04": "#FFFFFF",
    "color05": "#E0F2FE",
    "color06": "#0C4A6E",
    "color07": "#075985",
    "color08": "#BAE6FD",
    "color09": "#0284C7",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'blue', 'ocean']
),
(
  'Purple Haze',
  'Cool purple haze palette',
  '{
    "color01": "#7C3AED",
    "color02": "#8B5CF6",
    "color03": "#A78BFA",
    "color04": "#FFFFFF",
    "color05": "#FAF5FF",
    "color06": "#4C1D95",
    "color07": "#6D28D9",
    "color08": "#E9D5FF",
    "color09": "#6366F1",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'purple']
),
(
  'Teal Wave',
  'Cool teal wave palette',
  '{
    "color01": "#0D9488",
    "color02": "#14B8A6",
    "color03": "#5EEAD4",
    "color04": "#FFFFFF",
    "color05": "#F0FDFA",
    "color06": "#134E4A",
    "color07": "#0F766E",
    "color08": "#CCFBF1",
    "color09": "#2DD4BF",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'teal']
),
(
  'Slate Blue',
  'Cool slate blue palette',
  '{
    "color01": "#475569",
    "color02": "#64748B",
    "color03": "#94A3B8",
    "color04": "#FFFFFF",
    "color05": "#F8FAFC",
    "color06": "#0F172A",
    "color07": "#1E293B",
    "color08": "#CBD5E1",
    "color09": "#3B82F6",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#64748B"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'slate', 'blue']
),
(
  'Cyan Dream',
  'Cool cyan dream palette',
  '{
    "color01": "#0891B2",
    "color02": "#06B6D4",
    "color03": "#22D3EE",
    "color04": "#FFFFFF",
    "color05": "#ECFEFF",
    "color06": "#164E63",
    "color07": "#155E75",
    "color08": "#A5F3FC",
    "color09": "#0E7490",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'cyan']
),
(
  'Indigo Night',
  'Cool indigo night palette',
  '{
    "color01": "#4338CA",
    "color02": "#6366F1",
    "color03": "#818CF8",
    "color04": "#FFFFFF",
    "color05": "#EEF2FF",
    "color06": "#312E81",
    "color07": "#4F46E5",
    "color08": "#C7D2FE",
    "color09": "#4F46E5",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#6366F1"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'indigo']
),
(
  'Mint Frost',
  'Cool mint frost palette',
  '{
    "color01": "#059669",
    "color02": "#10B981",
    "color03": "#34D399",
    "color04": "#FFFFFF",
    "color05": "#ECFDF5",
    "color06": "#064E3B",
    "color07": "#047857",
    "color08": "#D1FAE5",
    "color09": "#059669",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#14B8A6"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'mint', 'green']
),
(
  'Ice Blue',
  'Cool ice blue palette',
  '{
    "color01": "#0EA5E9",
    "color02": "#38BDF8",
    "color03": "#7DD3FC",
    "color04": "#FFFFFF",
    "color05": "#F0F9FF",
    "color06": "#0C4A6E",
    "color07": "#075985",
    "color08": "#BAE6FD",
    "color09": "#0284C7",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#E0F2FE"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'blue', 'ice']
),
(
  'Cool Gray',
  'Neutral cool gray palette',
  '{
    "color01": "#475569",
    "color02": "#64748B",
    "color03": "#94A3B8",
    "color04": "#FFFFFF",
    "color05": "#F8FAFC",
    "color06": "#0F172A",
    "color07": "#1E293B",
    "color08": "#CBD5E1",
    "color09": "#334155",
    "color10": "#06B6D4",
    "color11": "#8B5CF6",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#6366F1",
    "color15": "#64748B"
  }'::jsonb,
  true,
  ARRAY['cool-tones', 'cool', 'gray', 'neutral']
),

-- Group 6: Warm Tones (10 palettes)
(
  'Sunset',
  'Warm sunset-inspired palette',
  '{
    "color01": "#FF6B35",
    "color02": "#F7931E",
    "color03": "#FFD23F",
    "color04": "#FFFFFF",
    "color05": "#FFF8E7",
    "color06": "#2C1810",
    "color07": "#8B6F47",
    "color08": "#E8D5B7",
    "color09": "#FF6B35",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#FF8C42"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'sunset', 'orange']
),
(
  'Autumn',
  'Warm autumn colors palette',
  '{
    "color01": "#DC2626",
    "color02": "#EA580C",
    "color03": "#F59E0B",
    "color04": "#FFFFFF",
    "color05": "#FFF7ED",
    "color06": "#7F1D1D",
    "color07": "#991B1B",
    "color08": "#FED7AA",
    "color09": "#DC2626",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#DC2626",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#B91C1C"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'autumn', 'red']
),
(
  'Fire',
  'Warm fire-inspired palette',
  '{
    "color01": "#DC2626",
    "color02": "#EA580C",
    "color03": "#F97316",
    "color04": "#FFFFFF",
    "color05": "#FFF7ED",
    "color06": "#7F1D1D",
    "color07": "#991B1B",
    "color08": "#FED7AA",
    "color09": "#DC2626",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#DC2626",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#B91C1C"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'fire', 'red']
),
(
  'Golden Hour',
  'Warm golden hour palette',
  '{
    "color01": "#D97706",
    "color02": "#F59E0B",
    "color03": "#FBBF24",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#92400E",
    "color08": "#FDE68A",
    "color09": "#F59E0B",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#B45309"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'golden', 'yellow']
),
(
  'Terracotta',
  'Warm terracotta palette',
  '{
    "color01": "#B45309",
    "color02": "#D97706",
    "color03": "#F59E0B",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#92400E",
    "color08": "#FDE68A",
    "color09": "#B45309",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#92400E"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'terracotta', 'orange']
),
(
  'Amber Glow',
  'Warm amber glow palette',
  '{
    "color01": "#D97706",
    "color02": "#F59E0B",
    "color03": "#FBBF24",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#92400E",
    "color08": "#FDE68A",
    "color09": "#F59E0B",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#FCD34D"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'amber']
),
(
  'Coral Reef',
  'Warm coral reef palette',
  '{
    "color01": "#F87171",
    "color02": "#FB923C",
    "color03": "#FBBF24",
    "color04": "#FFFFFF",
    "color05": "#FFF7ED",
    "color06": "#7F1D1D",
    "color07": "#991B1B",
    "color08": "#FED7AA",
    "color09": "#EF4444",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#FCA5A5"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'coral']
),
(
  'Rust',
  'Warm rust palette',
  '{
    "color01": "#B91C1C",
    "color02": "#DC2626",
    "color03": "#EF4444",
    "color04": "#FFFFFF",
    "color05": "#FEF2F2",
    "color06": "#7F1D1D",
    "color07": "#991B1B",
    "color08": "#FECACA",
    "color09": "#DC2626",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#DC2626",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#991B1B"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'rust', 'red']
),
(
  'Honey',
  'Warm honey palette',
  '{
    "color01": "#D97706",
    "color02": "#F59E0B",
    "color03": "#FCD34D",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#92400E",
    "color08": "#FDE68A",
    "color09": "#F59E0B",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#FBBF24"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'honey', 'yellow']
),
(
  'Copper',
  'Warm copper palette',
  '{
    "color01": "#B45309",
    "color02": "#D97706",
    "color03": "#F59E0B",
    "color04": "#FFFFFF",
    "color05": "#FFFBEB",
    "color06": "#78350F",
    "color07": "#92400E",
    "color08": "#FDE68A",
    "color09": "#B45309",
    "color10": "#10B981",
    "color11": "#F59E0B",
    "color12": "#EF4444",
    "color13": "#3B82F6",
    "color14": "#8B5CF6",
    "color15": "#92400E"
  }'::jsonb,
  true,
  ARRAY['warm-tones', 'warm', 'copper', 'orange']
)
ON CONFLICT DO NOTHING;

-- Note: Palettes with <15 colors will be filled with variations in the application layer
-- The fill logic will create lighter/darker variations of existing colors to reach 15 total
