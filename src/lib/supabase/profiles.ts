/**
 * Profile and profile field values (public schema).
 * Caller must ensure the current user can only access their own data (RLS enforces for direct client use).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  ProfileFieldValue,
  ProfileFieldValueInsert,
  ProfileWithFields,
} from "@/types/profiles";

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function upsertProfile(row: ProfileInsert & Partial<ProfileUpdate>): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: row.user_id,
        display_name: row.display_name ?? null,
        avatar_url: row.avatar_url ?? null,
        title: row.title ?? null,
        company: row.company ?? null,
        bio: row.bio ?? null,
        phone: row.phone ?? null,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) {
    console.error("upsertProfile:", error);
    return null;
  }
  return data as Profile;
}

export async function getProfileFieldValues(userId: string): Promise<ProfileFieldValue[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profile_field_values")
    .select("*")
    .eq("user_id", userId)
    .order("field_key", { ascending: true });
  if (error) {
    console.error("getProfileFieldValues:", error);
    return [];
  }
  return (data as ProfileFieldValue[]) ?? [];
}

export async function setProfileFieldValue(row: ProfileFieldValueInsert): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("profile_field_values")
    .upsert(
      { user_id: row.user_id, field_key: row.field_key, value: row.value ?? null },
      { onConflict: "user_id,field_key" }
    );
  if (error) {
    console.error("setProfileFieldValue:", error);
    return false;
  }
  return true;
}

export async function deleteProfileFieldValue(userId: string, fieldKey: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("profile_field_values")
    .delete()
    .eq("user_id", userId)
    .eq("field_key", fieldKey);
  if (error) {
    console.error("deleteProfileFieldValue:", error);
    return false;
  }
  return true;
}

/** Get profile plus custom fields as a single object for the Settings UI. */
export async function getProfileWithFields(userId: string): Promise<ProfileWithFields | null> {
  const profile = await getProfileByUserId(userId);
  const fields = await getProfileFieldValues(userId);
  const custom_fields: Record<string, string> = {};
  for (const f of fields) {
    custom_fields[f.field_key] = f.value ?? "";
  }
  if (!profile) {
    return {
      user_id: userId,
      display_name: null,
      avatar_url: null,
      title: null,
      company: null,
      bio: null,
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      custom_fields,
    } as ProfileWithFields;
  }
  return { ...profile, custom_fields };
}
