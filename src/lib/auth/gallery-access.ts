/**
 * Gallery access control for membership protection.
 * Used by standalone gallery page and embedded galleries.
 */

import { getClientSchema } from "@/lib/supabase/schema";
import type { UserMetadata } from "./supabase-auth";

export interface GalleryAccessInfo {
  access_level: "public" | "members" | "mag" | null;
  visibility_mode: "hidden" | "message" | null;
  restricted_message: string | null;
  required_mag_ids: string[];
}

export interface GalleryAccessResult {
  hasAccess: boolean;
  visibilityMode?: "hidden" | "message";
  restrictedMessage?: string;
}

/**
 * Check if the current user has access to a gallery.
 * - public: always allow
 * - members: require authenticated user with type=member (or admin/superadmin)
 * - mag: require authenticated member whose contact has at least one of the gallery's MAGs
 *
 * Admins and superadmins bypass protection (they manage the site).
 */
export async function checkGalleryAccess(
  galleryAccessInfo: GalleryAccessInfo
): Promise<GalleryAccessResult> {
  const { access_level, visibility_mode, restricted_message } = galleryAccessInfo;

  if (!access_level || access_level === "public") {
    return { hasAccess: true };
  }

  const { createServerSupabaseClientSSR } = await import("@/lib/supabase/client");
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();

  const metadata = user?.user_metadata as UserMetadata | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";

  // Admins and superadmins bypass
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
    // Any authenticated user with type=member (or admin already bypassed)
    const isMember = metadata?.type === "member";
    if (isMember) return { hasAccess: true };

    return {
      hasAccess: false,
      visibilityMode: (visibility_mode as "hidden" | "message") ?? "hidden",
      restrictedMessage: restricted_message ?? undefined,
    };
  }

  if (access_level === "mag") {
    const requiredMagIds = galleryAccessInfo.required_mag_ids ?? [];
    if (requiredMagIds.length === 0) {
      // No MAGs assigned — treat as members-only
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
    const hasAnyMag = requiredMagIds.some((id) => memberMagIds.includes(id));

    if (hasAnyMag) return { hasAccess: true };

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
 * Get MAG IDs for a member user (via members → contact → crm_contact_mags).
 * Only Active status is considered.
 */
async function getMemberMagIds(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/client").createServerSupabaseClientSSR>>,
  userId: string
): Promise<string[]> {
  const schema = getClientSchema();

  const { data: member } = await supabase
    .schema(schema)
    .from("members")
    .select("contact_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!member?.contact_id) return [];

  const { data: contactMags } = await supabase
    .schema(schema)
    .from("crm_contact_mags")
    .select("mag_id")
    .eq("contact_id", member.contact_id)
    .eq("status", "Active");

  return (contactMags ?? []).map((r) => r.mag_id);
}
