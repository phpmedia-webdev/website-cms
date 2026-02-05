/**
 * Content access control for blog and pages (membership protection).
 * Mirrors gallery-access: public → allow; members → auth + type member; mag → auth + MAG check.
 */

import { getMemberMagIds } from "./gallery-access";
import type { UserMetadata } from "./supabase-auth";

export interface ContentAccessInfo {
  access_level: "public" | "members" | "mag" | null;
  required_mag_id: string | null;
  visibility_mode: "hidden" | "message" | null;
  restricted_message: string | null;
}

export interface ContentAccessResult {
  hasAccess: boolean;
  visibilityMode?: "hidden" | "message";
  restrictedMessage?: string;
}

/**
 * Check if the current user has access to a content item (post or page).
 * - public: always allow
 * - members: require authenticated user with type=member (or admin/superadmin bypass)
 * - mag: require authenticated member whose contact has the content's required_mag_id
 *
 * Admins and superadmins bypass (they manage the site).
 */
export async function checkContentAccess(
  contentAccessInfo: ContentAccessInfo
): Promise<ContentAccessResult> {
  const { access_level, required_mag_id, visibility_mode, restricted_message } = contentAccessInfo;

  if (!access_level || access_level === "public") {
    return { hasAccess: true };
  }

  const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();

  const metadata = user?.user_metadata as UserMetadata | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";

  if (isAdmin && user) {
    return { hasAccess: true };
  }

  if (!user) {
    return {
      hasAccess: false,
      visibilityMode: (visibility_mode as "hidden" | "message") ?? "hidden",
      restrictedMessage: restricted_message ?? undefined,
    };
  }

  if (access_level === "members") {
    const isMember = metadata?.type === "member";
    if (isMember) return { hasAccess: true };
    return {
      hasAccess: false,
      visibilityMode: (visibility_mode as "hidden" | "message") ?? "hidden",
      restrictedMessage: restricted_message ?? undefined,
    };
  }

  if (access_level === "mag") {
    if (!required_mag_id?.trim()) {
      const isMember = metadata?.type === "member";
      return isMember
        ? { hasAccess: true }
        : {
            hasAccess: false,
            visibilityMode: (visibility_mode as "hidden" | "message") ?? "hidden",
            restrictedMessage: restricted_message ?? undefined,
          };
    }
    const memberMagIds = await getMemberMagIds(supabase, user.id);
    const hasMag = memberMagIds.includes(required_mag_id.trim());
    if (hasMag) return { hasAccess: true };
    return {
      hasAccess: false,
      visibilityMode: (visibility_mode as "hidden" | "message") ?? "hidden",
      restrictedMessage: restricted_message ?? undefined,
    };
  }

  return {
    hasAccess: false,
    visibilityMode: (visibility_mode as "hidden" | "message") ?? "hidden",
    restrictedMessage: restricted_message ?? undefined,
  };
}
