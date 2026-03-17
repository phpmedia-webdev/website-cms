/**
 * Resolve comment author display name: tenant_users first, then profile/Auth (for GPUM, superadmin).
 * Content author: tenant_user id first, then profile/Auth user id (superadmin fallback).
 * Profile display_name (Settings → My Profile) is used when available; else Auth user_metadata; else email.
 */

import { getTenantUserByAuthUserId, getTenantUserById } from "@/lib/supabase/tenant-users";
import { getUserById } from "@/lib/supabase/users";
import { getProfileByUserId } from "@/lib/supabase/profiles";

const FALLBACK_NAME = "Commenter";

/** Resolve display label for an auth user: handle (for messaging) first, then display_name, then user_metadata/email. */
async function getAuthUserDisplayName(authUserId: string): Promise<string> {
  const profile = await getProfileByUserId(authUserId);
  if (profile?.handle?.trim()) return profile.handle.trim();
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
 * Get display label for a user (handle preferred for messages/comments).
 * Use in activity stream, task threads, blog comments. Returns handle ?? display_name ?? email ?? "User".
 */
export async function getDisplayLabelForUser(authUserId: string): Promise<string> {
  const tenantUser = await getTenantUserByAuthUserId(authUserId);
  const profile = await getProfileByUserId(authUserId);
  if (profile?.handle?.trim()) return profile.handle.trim();
  if (tenantUser?.display_name?.trim()) return tenantUser.display_name.trim();
  if (tenantUser?.email) return tenantUser.email;
  if (profile?.display_name?.trim()) return profile.display_name.trim();
  const { user, error } = await getUserById(authUserId);
  if (error || !user) return "User";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromAuth =
    (meta?.full_name as string)?.trim() ||
    (meta?.name as string)?.trim() ||
    (meta?.display_name as string)?.trim() ||
    user.email;
  return fromAuth ?? "User";
}

/**
 * Get display name for a comment author (auth user id). Uses handle when set (for messaging), then display_name, then email.
 */
export async function getCommentAuthorDisplayName(authUserId: string): Promise<string> {
  const name = await getDisplayLabelForUser(authUserId);
  return name || FALLBACK_NAME;
}

/**
 * Get display name for a content author (tenant_user id or auth user id). Uses handle when set, then display_name, then email.
 */
export async function getContentAuthorDisplayName(authorId: string): Promise<string> {
  const tenantUser = await getTenantUserById(authorId);
  if (tenantUser) {
    const profile = await getProfileByUserId(tenantUser.user_id);
    if (profile?.handle?.trim()) return profile.handle.trim();
    if (tenantUser.display_name?.trim()) return tenantUser.display_name.trim();
    if (tenantUser.email) return tenantUser.email;
  }
  return getDisplayLabelForUser(authorId);
}
