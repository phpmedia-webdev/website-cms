/**
 * Members utilities: qualified contacts with member portal access.
 * Member = contact elevated via purchase, admin grant, or signup code.
 * Existence of members row = member; user_id nullable until they register.
 * See docs/reference/members-and-ownership-summary.md
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";

const MEMBERS_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface Member {
  id: string;
  contact_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Get member by contact ID. Returns null if not a member. */
export async function getMemberByContactId(
  contactId: string
): Promise<Member | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(MEMBERS_SCHEMA)
    .from("members")
    .select("*")
    .eq("contact_id", contactId)
    .maybeSingle();

  if (error) {
    console.error("getMemberByContactId error:", error);
    return null;
  }
  return data as Member | null;
}

/** Get member by auth user ID. Returns null if not a member. */
export async function getMemberByUserId(
  userId: string
): Promise<Member | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(MEMBERS_SCHEMA)
    .from("members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getMemberByUserId error:", error);
    return null;
  }
  return data as Member | null;
}

/** Elevate contact to member. Idempotent: if members row exists, returns it. */
export async function createMemberForContact(
  contactId: string,
  userId?: string | null
): Promise<{ member: Member | null; error: string | null }> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  // Check existing
  const existing = await getMemberByContactId(contactId);
  if (existing) {
    // Optionally update user_id if provided and currently null
    if (userId && !existing.user_id) {
      const { data: updated, error } = await supabase
        .schema(schema)
        .from("members")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        console.error("createMemberForContact update user_id error:", error);
        return { member: existing, error: error.message };
      }
      return { member: updated as Member, error: null };
    }
    return { member: existing, error: null };
  }

  const { data, error } = await supabase
    .schema(schema)
    .from("members")
    .insert({
      contact_id: contactId,
      user_id: userId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createMemberForContact error:", error);
    return { member: null, error: error.message };
  }
  return { member: data as Member, error: null };
}

/** Resolve member ID for current auth user. Returns null if not logged in or not a member. */
export async function resolveMemberFromAuth(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) return null;

  const member = await getMemberByUserId(user.id);
  return member?.id ?? null;
}
