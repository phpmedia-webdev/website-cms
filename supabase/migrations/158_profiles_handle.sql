-- File: 158_profiles_handle.sql
-- Phase 19 expansion: handle (nickname) and communicate_in_messages for profile.
-- Handle: unique when set; required for group/social messaging. Editable in profile.
-- communicate_in_messages: when true, user can participate in messages/comments beyond ticket-to-admin.
-- Run in Supabase SQL Editor.

SET search_path TO public;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS communicate_in_messages BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_not_null
  ON public.profiles(handle) WHERE handle IS NOT NULL;

COMMENT ON COLUMN public.profiles.handle IS 'User nickname/handle for messaging. Required for group conversations and DMs; auto-generated on first support ticket if unset. Editable in profile.';
COMMENT ON COLUMN public.profiles.communicate_in_messages IS 'When true, user may participate in group conversations and messaging. When false, only ticket-to-admin is allowed (handle can still be set).';
