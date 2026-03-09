/**
 * Resolve comment author display name: tenant_users first, then Auth user (for GPUM, superadmin).
 */

import { getTenantUserByAuthUserId } from "@/lib/supabase/tenant-users";
import { getUserById } from "@/lib/supabase/users";

const FALLBACK_NAME = "Commenter";

/**
 * Get display name for a comment author (auth user id).
 * Tries tenant_users (admins) then Auth admin API (members, superadmin, anyone else).
 */
export async function getCommentAuthorDisplayName(authUserId: string): Promise<string> {
  const tenantUser = await getTenantUserByAuthUserId(authUserId);
  if (tenantUser) {
    const name = tenantUser.display_name?.trim() || tenantUser.email;
    if (name) return name;
  }
  const { user, error } = await getUserById(authUserId);
  if (error || !user) return FALLBACK_NAME;
  const fromAuth =
    (user.user_metadata?.full_name as string)?.trim() ||
    (user.user_metadata?.name as string)?.trim() ||
    user.email;
  return fromAuth || FALLBACK_NAME;
}
