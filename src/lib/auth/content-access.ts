/**
 * Content access control for blog and pages (membership protection).
 * Mirrors gallery-access: public → allow; members → auth + type member; mag → auth + MAG check.
 * When tenant_sites.membership_enabled is false, all content is treated as public (no gating).
 * Bypass for admin/superadmin uses central role (getRoleForCurrentUser) when PHP-Auth configured.
 */

import { getMemberMagIds } from "./gallery-access";
import type { UserMetadata } from "./supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "./resolve-role";
import { isMembershipEnabledForCurrentTenant } from "@/lib/supabase/tenant-sites";

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

  const membershipEnabled = await isMembershipEnabledForCurrentTenant();
  if (!membershipEnabled) return { hasAccess: true };

  if (!access_level || access_level === "public") {
    return { hasAccess: true };
  }

  const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();

  const role = await getRoleForCurrentUser();
  const canBypass = user && role !== null && (isSuperadminFromRole(role) || isAdminRole(role));
  if (canBypass) return { hasAccess: true };

  const metadata = user?.user_metadata as UserMetadata | undefined;

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

/**
 * Filter content rows (e.g. blog list) to those the current user can access.
 * Use after fetching a list so restricted items are not shown.
 * Requires access_level and required_mag_id on each row.
 */
export async function filterContentByAccess<T extends { access_level?: string | null; required_mag_id?: string | null }>(
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return [];

  const membershipEnabled = await isMembershipEnabledForCurrentTenant();
  if (!membershipEnabled) return items;

  const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();

  const role = await getRoleForCurrentUser();
  if (user && role !== null && (isSuperadminFromRole(role) || isAdminRole(role))) return items;

  const metadata = user?.user_metadata as UserMetadata | undefined;

  let memberMagIds: string[] = [];
  if (user && metadata?.type === "member") {
    const { getMemberMagIds } = await import("./gallery-access");
    memberMagIds = await getMemberMagIds(supabase, user.id);
  }

  return items.filter((item) => {
    const level = (item.access_level as "public" | "members" | "mag") ?? "public";
    if (!level || level === "public") return true;
    if (!user) return false;
    if (level === "members") return metadata?.type === "member";
    if (level === "mag") {
      const magId = item.required_mag_id?.trim();
      if (!magId) return metadata?.type === "member";
      return memberMagIds.includes(magId);
    }
    return false;
  });
}
