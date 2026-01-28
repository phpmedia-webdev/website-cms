-- Run this in Supabase Dashboard → SQL Editor to verify migrations 052 and 053.
-- Schema: website_cms_template_dev (052 tables), public (053 RPCs).

-- 1. CRM tables (052): should return one row per table
SELECT 'crm_contacts' AS obj, COUNT(*) AS cnt FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_contacts'
UNION ALL
SELECT 'crm_notes', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_notes'
UNION ALL
SELECT 'forms', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'forms'
UNION ALL
SELECT 'mags', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'mags'
UNION ALL
SELECT 'crm_custom_fields', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_custom_fields'
UNION ALL
SELECT 'crm_contact_custom_fields', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_contact_custom_fields'
UNION ALL
SELECT 'crm_contact_mags', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_contact_mags'
UNION ALL
SELECT 'crm_consents', COUNT(*) FROM information_schema.tables
WHERE table_schema = 'website_cms_template_dev' AND table_name = 'crm_consents';

-- 2. CRM RPCs (053): should return one row per function
SELECT routine_name AS rpc
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_contacts_dynamic',
    'get_contact_by_id_dynamic',
    'get_forms_dynamic',
    'get_mags_dynamic',
    'get_contact_notes_dynamic',
    'get_crm_custom_fields_dynamic',
    'get_contact_custom_fields_dynamic',
    'get_contact_mags_dynamic'
  )
ORDER BY routine_name;

-- 3. Quick smoke: call one RPC (should return empty set, no error)
SELECT * FROM public.get_contacts_dynamic('website_cms_template_dev'::text) LIMIT 1;
