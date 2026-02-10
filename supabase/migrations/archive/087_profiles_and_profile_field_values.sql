-- File: 087_profiles_and_profile_field_values.sql
-- Creates public.profiles (one row per user) and public.profile_field_values (extensible key-value for custom/Digicard fields).
-- RLS: users can read and update only their own row(s).

SET search_path TO public;

-- Core profile: one row per user (auth.users.id).
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  title text,
  company text,
  bio text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile (display name, avatar, title, company, bio, phone). One row per user; editable by self.';

CREATE INDEX idx_profiles_display_name ON public.profiles(display_name);

-- Extensible custom fields (e.g. linkedin_url, digicard_slug).
CREATE TABLE public.profile_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, field_key)
);

COMMENT ON TABLE public.profile_field_values IS 'Custom profile field values (key-value per user). Editable by self.';

CREATE INDEX idx_profile_field_values_user_id ON public.profile_field_values(user_id);
CREATE INDEX idx_profile_field_values_field_key ON public.profile_field_values(field_key);

-- RLS: enable and policies for own-row access only.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY profile_field_values_select_own ON public.profile_field_values
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY profile_field_values_update_own ON public.profile_field_values
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY profile_field_values_insert_own ON public.profile_field_values
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY profile_field_values_delete_own ON public.profile_field_values
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: trigger to keep updated_at in sync (profiles).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profile_field_values_updated_at
  BEFORE UPDATE ON public.profile_field_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
