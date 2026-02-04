/**
 * Types for public.profiles and public.profile_field_values.
 * One profile per user; custom fields stored as key-value in profile_field_values.
 */

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  phone?: string | null;
}

export interface ProfileUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  phone?: string | null;
}

export interface ProfileFieldValue {
  id: string;
  user_id: string;
  field_key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileFieldValueInsert {
  user_id: string;
  field_key: string;
  value?: string | null;
}

export type ProfileWithFields = Profile & {
  custom_fields: Record<string, string>;
};
