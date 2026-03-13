-- File: 111_drop_mfa_upgrade_tokens.sql
-- Removes the one-time token table used for MFA cookie handoff.
-- MFA verify now sets cookies on redirect (same pattern as auth callback); no DB storage.
-- Run in Supabase SQL Editor.

SET search_path TO public;

DROP TABLE IF EXISTS public.mfa_upgrade_tokens;
