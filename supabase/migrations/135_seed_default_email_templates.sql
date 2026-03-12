-- File: 135_seed_default_email_templates.sql
-- Step 21: Seed default email template content (order-confirmation, digital-delivery) so triggers have templates to use.
-- Run after 134 (template content type exists). Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema.

SET search_path TO website_cms_template_dev, public;

-- Order confirmation (used when order is marked paid)
INSERT INTO website_cms_template_dev.content (
  content_type_id,
  title,
  slug,
  body,
  status
)
SELECT
  ct.id,
  'Order confirmation',
  'order-confirmation',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{customer_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Thank you for your order. Order #{{order_id}} — Total: {{order_total}}"}]},{"type":"paragraph","content":[{"type":"text","text":"View your order: {{access_link}}"}]},{"type":"paragraph","content":[{"type":"text","text":"Questions? Contact {{business_name}} at {{business_email}}"}]}]}'::jsonb,
  'published'
FROM website_cms_template_dev.content_types ct
WHERE ct.slug = 'template'
LIMIT 1
ON CONFLICT (content_type_id, slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Digital delivery / access instructions (used when order status set to completed, no shippable)
INSERT INTO website_cms_template_dev.content (
  content_type_id,
  title,
  slug,
  body,
  status
)
SELECT
  ct.id,
  'Digital delivery',
  'digital-delivery',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{customer_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Your purchase is complete. Access your order and any digital items here: {{access_link}}"}]},{"type":"paragraph","content":[{"type":"text","text":"{{business_name}}"}]}]}'::jsonb,
  'published'
FROM website_cms_template_dev.content_types ct
WHERE ct.slug = 'template'
LIMIT 1
ON CONFLICT (content_type_id, slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  updated_at = NOW();
