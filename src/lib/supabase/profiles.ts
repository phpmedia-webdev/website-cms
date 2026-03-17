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
        handle: row.handle ?? null,
        communicate_in_messages: row.communicate_in_messages ?? false,
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

/**
 * Ensure the member has a handle. If missing, auto-generate one (do NOT set communicate_in_messages).
 * Used when GPUM creates a support ticket so the ticket can be created; user can change handle later in profile.
 * Returns { handle, created: true } if a handle was generated, { handle, created: false } if they already had one.
 */
export async function getOrCreateMemberHandle(userId: string): Promise<{ handle: string; created: boolean }> {
  const profile = await getProfileByUserId(userId);
  const existingHandle = profile?.handle?.trim();
  if (existingHandle) {
    return { handle: existingHandle, created: false };
  }
  const supabase = createServerSupabaseClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = "user-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("handle", candidate)
      .limit(1)
      .maybeSingle();
    if (existing) continue;
    const updated = await upsertProfile({
      user_id: userId,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      title: profile?.title ?? null,
      company: profile?.company ?? null,
      bio: profile?.bio ?? null,
      phone: profile?.phone ?? null,
      handle: candidate,
      communicate_in_messages: profile?.communicate_in_messages ?? false,
    });
    if (updated) {
      return { handle: candidate, created: true };
    }
  }
  throw new Error("Failed to generate unique handle");
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
      handle: null,
      communicate_in_messages: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      custom_fields,
    } as ProfileWithFields;
  }
  return { ...profile, custom_fields };
}
