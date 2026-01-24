-- Refresh PostgREST cache after creating color_palettes table
-- This ensures PostgREST can see the new table

NOTIFY pgrst, 'reload schema';
