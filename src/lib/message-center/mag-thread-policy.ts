/**
 * MAG group thread posting: broadcast when allow_conversations is false (superadmin + tenant admin only);
 * community when true (GPUM needs global + per-MAG opt-in).
 */

import { createServerSupabaseClient } from "@/lib/supabase/server-service";
import { getClientSchema } from "@/lib/supabase/schema";
import {
  getConversationThreadById,
  listSupportThreadsForContact,
} from "@/lib/supabase/conversation-threads";
import { memberEnrolledInMag } from "@/lib/message-center/gpum-mag-eligibility";
import { getMemberByUserId } from "@/lib/supabase/members";
import {
  getRoleForCurrentUser,
  isSuperadminFromRole,
  isTenantAdminRole,
  isAdminRole,
} from "@/lib/auth/resolve-role";
import { isMemberRole } from "@/lib/php-auth/role-mapping";

export interface MagPostMessageContext {
  threadId: string;
  authorUserId: string;
  authorContactId: string | null;
}

export type MagPostDeniedReason =
  | "not_found"
  | "wrong_thread_type"
  | "mag_not_found"
  | "gpum_contact_mismatch"
  | "community_disabled_non_broadcaster"
  | "community_needs_contact_author"
  | "gpum_global_off"
  | "gpum_mag_not_opted_in";

export async function assertCanPostThreadMessage(
  ctx: MagPostMessageContext
): Promise<{ ok: true } | { ok: false; status: number; reason: MagPostDeniedReason; message: string }> {
  const thread = await getConversationThreadById(ctx.threadId);
  if (!thread) {
    return { ok: false, status: 404, reason: "not_found", message: "Thread not found" };
  }
  if (thread.thread_type !== "mag_group" || !thread.mag_id) {
    return { ok: true };
  }

  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: magRow, error: magErr } = await supabase
    .schema(schema)
    .from("mags")
    .select("id, allow_conversations")
    .eq("id", thread.mag_id)
    .maybeSingle();

  if (magErr || !magRow) {
    return { ok: false, status: 400, reason: "mag_not_found", message: "MAG not found for thread" };
  }

  const allowConversations =
    magRow.allow_conversations === undefined || magRow.allow_conversations === null
      ? true
      : Boolean(magRow.allow_conversations);

  const role = await getRoleForCurrentUser();
  const topBroadcaster =
    role !== null && (isSuperadminFromRole(role) || isTenantAdminRole(role));

  if (!allowConversations) {
    if (!topBroadcaster) {
      return {
        ok: false,
        status: 403,
        reason: "community_disabled_non_broadcaster",
        message: "Only tenant superadmin or admin may post when member conversations are disabled for this MAG.",
      };
    }
    if (ctx.authorContactId) {
      return {
        ok: false,
        status: 403,
        reason: "community_needs_contact_author",
        message: "MAG announcements must be staff-only posts when conversations are disabled.",
      };
    }
    return { ok: true };
  }

  // Community allowed: staff (any admin-side role) may post without extra MAG opt-in checks.
  if (role && isAdminRole(role) && !isMemberRole(role)) {
    return { ok: true };
  }

  if (!role || !isMemberRole(role)) {
    return {
      ok: false,
      status: 403,
      reason: "community_disabled_non_broadcaster",
      message: "MAG community messaging is for members (GPUM) or staff.",
    };
  }

  const member = await getMemberByUserId(ctx.authorUserId);
  if (!member) {
    return { ok: false, status: 403, reason: "gpum_contact_mismatch", message: "Member record required" };
  }
  if (!ctx.authorContactId || ctx.authorContactId !== member.contact_id) {
    return {
      ok: false,
      status: 403,
      reason: "gpum_contact_mismatch",
      message: "author_contact_id must match the signed-in member contact.",
    };
  }

  const { data: contactRow, error: cErr } = await supabase
    .schema(schema)
    .from("crm_contacts")
    .select("id, mag_community_messaging_enabled")
    .eq("id", member.contact_id)
    .maybeSingle();

  if (cErr || !contactRow) {
    return { ok: false, status: 400, reason: "gpum_global_off", message: "Contact not found" };
  }

  const globalOn = Boolean(contactRow.mag_community_messaging_enabled);
  if (!globalOn) {
    return {
      ok: false,
      status: 403,
      reason: "gpum_global_off",
      message: "Enable MAG community messaging on your profile to post in MAG rooms.",
    };
  }

  const { data: optRow, error: oErr } = await supabase
    .schema(schema)
    .from("crm_contact_mag_community_opt_in")
    .select("mag_id")
    .eq("contact_id", member.contact_id)
    .eq("mag_id", thread.mag_id)
    .maybeSingle();

  if (oErr || !optRow) {
    return {
      ok: false,
      status: 403,
      reason: "gpum_mag_not_opted_in",
      message: "Opt in to community messaging for this MAG on your profile.",
    };
  }

  return { ok: true };
}

/**
 * GPUM (and staff) may read thread messages when this passes. POST still uses {@link assertCanPostThreadMessage}.
 */
export async function assertMemberCanReadThread(
  threadId: string,
  authUserId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const role = await getRoleForCurrentUser();
  if (role !== null && isAdminRole(role) && !isMemberRole(role)) {
    return { ok: true };
  }

  const member = await getMemberByUserId(authUserId);
  if (!member) {
    return { ok: false, status: 403, message: "Not allowed" };
  }

  const thread = await getConversationThreadById(threadId);
  if (!thread) {
    return { ok: false, status: 404, message: "Thread not found" };
  }

  if (thread.thread_type === "support") {
    const sid = thread.subject_id?.trim() ?? "";
    if (sid && sid === member.contact_id) {
      return { ok: true };
    }
    const supportThreads = await listSupportThreadsForContact(member.contact_id);
    if (supportThreads.some((t) => t.id === threadId)) {
      return { ok: true };
    }
    return { ok: false, status: 403, message: "Cannot access this conversation" };
  }

  if (thread.thread_type === "mag_group" && thread.mag_id) {
    if (await memberEnrolledInMag(member.contact_id, thread.mag_id)) {
      return { ok: true };
    }
    return { ok: false, status: 403, message: "Cannot access this MAG conversation" };
  }

  return { ok: false, status: 403, message: "Cannot access this thread" };
}
