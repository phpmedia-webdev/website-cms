-- File: 142_invoices_and_number_sequences.sql
-- Invoicing: invoices, invoice_lines, shared number sequence for invoice_number and order_number.
-- Run in Supabase SQL Editor. Replace website_cms_template_dev with your client schema if different.

SET search_path TO website_cms_template_dev, public;

-- Shared number sequence (one row per tenant): used for invoice_number and order_number.
CREATE TABLE IF NOT EXISTS website_cms_template_dev.number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'invoice_order' UNIQUE,
  format_template TEXT NOT NULL DEFAULT 'INV-YYYY-NNNNN',
  sequence_length INTEGER NOT NULL DEFAULT 5 CHECK (sequence_length > 0 AND sequence_length <= 20),
  start_number INTEGER NOT NULL DEFAULT 1 CHECK (start_number >= 0),
  last_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO website_cms_template_dev.number_sequences (name, format_template, sequence_length, start_number, last_value)
VALUES ('invoice_order', 'INV-YYYY-NNNNN', 5, 1, 0)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_number_sequences_name ON website_cms_template_dev.number_sequences(name);

ALTER TABLE website_cms_template_dev.number_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access number_sequences"
  ON website_cms_template_dev.number_sequences FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON TABLE website_cms_template_dev.number_sequences TO service_role;

-- Invoices (one-off; subscription payments create orders via webhook).
CREATE TABLE IF NOT EXISTS website_cms_template_dev.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT,
  customer_email TEXT NOT NULL,
  contact_id UUID REFERENCES website_cms_template_dev.crm_contacts(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'open', 'paid')),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON website_cms_template_dev.invoices(customer_email);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON website_cms_template_dev.invoices(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON website_cms_template_dev.invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON website_cms_template_dev.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON website_cms_template_dev.invoices(created_at DESC);

CREATE OR REPLACE FUNCTION website_cms_template_dev.update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_updated_at ON website_cms_template_dev.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON website_cms_template_dev.invoices
  FOR EACH ROW
  EXECUTE FUNCTION website_cms_template_dev.update_invoices_updated_at();

ALTER TABLE website_cms_template_dev.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access invoices"
  ON website_cms_template_dev.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.invoices TO service_role;

-- Invoice lines: product from library, editable line_description.
CREATE TABLE IF NOT EXISTS website_cms_template_dev.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES website_cms_template_dev.invoices(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES website_cms_template_dev.content(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL,
  line_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON website_cms_template_dev.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_content_id ON website_cms_template_dev.invoice_lines(content_id);

ALTER TABLE website_cms_template_dev.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access invoice_lines"
  ON website_cms_template_dev.invoice_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE website_cms_template_dev.invoice_lines TO service_role;

-- Orders: add order_number (shared sequence with invoices).
ALTER TABLE website_cms_template_dev.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON website_cms_template_dev.orders(order_number) WHERE order_number IS NOT NULL;

COMMENT ON COLUMN website_cms_template_dev.orders.order_number IS 'Display number from shared sequence (e.g. INV-2026-00015); same generator as invoices.';

-- RPC: atomically get next number and return formatted string (e.g. INV-2026-00015).
CREATE OR REPLACE FUNCTION website_cms_template_dev.get_next_invoice_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  fmt TEXT;
  num_str TEXT;
BEGIN
  UPDATE website_cms_template_dev.number_sequences
  SET last_value = last_value + 1,
      updated_at = NOW()
  WHERE name = 'invoice_order'
  RETURNING format_template, sequence_length, last_value INTO rec;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'number_sequences row invoice_order not found';
  END IF;
  fmt := rec.format_template;
  fmt := replace(fmt, 'YYYY', to_char(NOW(), 'YYYY'));
  fmt := replace(fmt, 'MM', lpad(to_char(NOW(), 'MM'), 2, '0'));
  fmt := replace(fmt, 'DD', lpad(to_char(NOW(), 'DD'), 2, '0'));
  num_str := lpad(rec.last_value::TEXT, rec.sequence_length, '0');
  fmt := regexp_replace(fmt, 'N+', num_str);
  RETURN fmt;
END;
$$;

GRANT EXECUTE ON FUNCTION website_cms_template_dev.get_next_invoice_order_number() TO service_role;
