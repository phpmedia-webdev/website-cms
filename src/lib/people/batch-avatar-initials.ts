/**
 * Server-only batch resolution of avatar initials from structured names + email,
 * not from display labels. See `initialsFromFirstLast` in `@/lib/ui/avatar-initials`.
 */

import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import { getProfileFieldValuesForUsers } from "@/lib/supabase/profiles";
import { getTenantUsersByAuthUserIds } from "@/lib/supabase/tenant-users";

function uniqueUserIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id?.trim()))];
}

/** `user_id` → initials (profile `first_name` / `last_name` custom fields, then tenant email). */
export async function batchUserAvatarInitials(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = uniqueUserIds(userIds);
  if (unique.length === 0) return map;

  const [fieldsByUser, tenants] = await Promise.all([
    getProfileFieldValuesForUsers(unique, ["first_name", "last_name"]),
    getTenantUsersByAuthUserIds(unique),
  ]);

  const emailByUser = new Map<string, string>();
  for (const t of tenants) {
    if (t.user_id) emailByUser.set(t.user_id, (t.email ?? "").trim());
  }

  for (const uid of unique) {
    const f = fieldsByUser.get(uid) ?? {};
    map.set(
      uid,
      initialsFromFirstLast(f.first_name, f.last_name, emailByUser.get(uid) ?? "")
    );
  }
  return map;
}
