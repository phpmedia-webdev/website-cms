-- File: 157_invoices_project_id.sql
-- Phase 19 expansion: add project_id to invoices. When order is created from paid invoice, copy project_id to order.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

ALTER TABLE website_cms_template_dev.invoices
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES website_cms_template_dev.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON website_cms_template_dev.invoices(project_id) WHERE project_id IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.invoices.project_id IS 'Link invoice to project (Phase 19). When invoice is paid and order created, project_id is copied to that order.';
