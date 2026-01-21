-- Refresh PostgREST schema cache
-- Run this after exposing a schema and granting permissions
-- This forces PostgREST to reload its schema cache

NOTIFY pgrst, 'reload schema';

-- Verify the notification was sent
SELECT 'PostgREST schema cache refresh notification sent' AS status;
