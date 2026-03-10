/**
 * Resolve comment author display name: tenant_users first, then profile/Auth (for GPUM, superadmin).
 * Content author: tenant_user id first, then profile/Auth user id (superadmin fallback).
 * Profile display_name (Settings → My Profile) is used when available; else Auth user_metadata; else email.
 */

import { getTenantUserByAuthUserId, getTenantUserById } from "@/lib/supabase/tenant-users";
import { getUserById } from "@/lib/supabase/users";
import { getProfileByUserId } from "@/lib/supabase/profiles";

const FALLBACK_NAME = "Commenter";

/** Resolve display name for an auth user id: profile first (Settings → My Profile), then user_metadata, then email. */
async function getAuthUserDisplayName(authUserId: string): Promise<string> {
  const profile = await getProfileByUserId(authUserId);
  if (profile?.display_name?.trim()) return profile.display_name.trim();
  const { user, error } = await getUserById(authUserId);
  if (error || !user) return "";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromAuth =
    (meta?.full_name as string)?.trim() ||
    (meta?.name as string)?.trim() ||
    (meta?.display_name as string)?.trim() ||
    user.email;
  return fromAuth ?? "";
}

/**
 * Get display name for a comment author (auth user id).
 * Tries tenant_users (admins) then profile (Settings → My Profile) then Auth user_metadata (members, superadmin).
 */
export async function getCommentAuthorDisplayName(authUserId: string): Promise<string> {
  const tenantUser = await getTenantUserByAuthUserId(authUserId);
  if (tenantUser) {
    const name = tenantUser.display_name?.trim() || tenantUser.email;
    if (name) return name;
  }
  const name = await getAuthUserDisplayName(authUserId);
  return name || FALLBACK_NAME;
}

/**
 * Get display name for a content author (tenant_user id or auth user id).
 * Tries tenant_users by id first, then profile (Settings → My Profile) then Auth user_metadata (superadmin).
 */
export async function getContentAuthorDisplayName(authorId: string): Promise<string> {
  const tenantUser = await getTenantUserById(authorId);
  if (tenantUser) {
    const name = tenantUser.display_name?.trim() || tenantUser.email;
    if (name) return name;
  }
  return getAuthUserDisplayName(authorId);
}
