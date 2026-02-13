-- File: 110_mfa_upgrade_tokens.sql
-- One-time tokens for MFA upgrade: verify API stores session cookies here;
-- success page reads and sets them on document response so cookies persist on Vercel.
-- Run in Supabase SQL Editor.

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.mfa_upgrade_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cookies jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

COMMENT ON TABLE public.mfa_upgrade_tokens IS 'One-time storage for MFA verify session cookies; consumed by /mfa/success page load.';

ALTER TABLE public.mfa_upgrade_tokens ENABLE ROW LEVEL SECURITY;

-- No policies: anon cannot read/write. Only service role (used in API and success page) can access.
-- Service role bypasses RLS.
