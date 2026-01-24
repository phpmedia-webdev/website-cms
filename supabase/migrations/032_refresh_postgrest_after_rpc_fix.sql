-- Media Library - Refresh PostgREST after RPC function fix
-- PostgREST needs to reload schema to pick up updated RPC functions

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
