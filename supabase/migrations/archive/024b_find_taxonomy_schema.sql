-- Helper query to find which schema contains the taxonomy tables
-- Run this FIRST to identify your schema name before running 024_grant_taxonomy_permissions.sql

-- Find taxonomy tables and their schemas
SELECT 
  table_schema, 
  table_name,
  'Found in schema: ' || table_schema AS location
FROM information_schema.tables 
WHERE table_name IN ('taxonomy_terms', 'taxonomy_relationships', 'section_taxonomy_config')
ORDER BY table_schema, table_name;

-- If no results, the tables might not exist yet. Check if migrations 021 and 022 were run:
-- SELECT table_schema, table_name 
-- FROM information_schema.tables 
-- WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
-- ORDER BY table_schema, table_name;
