-- File: 080_superadmin_code_snippets.sql
-- Superadmin code snippet library: store real code snippets (sections, pages, layout) for dev reference.
-- Table lives in public schema so it is shared across all tenant deployments.

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT,
  description TEXT,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_snippets_type ON public.code_snippets(type);

CREATE OR REPLACE FUNCTION public.code_snippets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS code_snippets_updated_at ON public.code_snippets;
CREATE TRIGGER code_snippets_updated_at
  BEFORE UPDATE ON public.code_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.code_snippets_updated_at();

COMMENT ON TABLE public.code_snippets IS 'Superadmin-only: reusable code snippets (sections, pages) for dev reference and donor code.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_snippets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_snippets TO service_role;
