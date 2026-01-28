-- Media Library - Step 4: Refresh PostgREST Schema Cache

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
