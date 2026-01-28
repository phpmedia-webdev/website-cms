-- Seed core content types (post, page, snippet, quote, article)
-- Run after 043. Uses ON CONFLICT DO NOTHING for slug so re-run is safe.

SET search_path TO website_cms_template_dev, public;

INSERT INTO website_cms_template_dev.content_types (slug, label, description, is_core, display_order)
VALUES
  ('post', 'Post', 'Blog posts; rich text body, excerpt, featured image.', true, 0),
  ('page', 'Page', 'Static pages (About, Services, etc.). Homepage via slug home or /.', true, 1),
  ('snippet', 'Snippet', 'Short text (e.g. FAQs, micro-copy).', true, 2),
  ('quote', 'Quote', 'Testimonials or quotes.', true, 3),
  ('article', 'Article', 'Long-form editorial content.', true, 4)
ON CONFLICT (slug) DO NOTHING;
