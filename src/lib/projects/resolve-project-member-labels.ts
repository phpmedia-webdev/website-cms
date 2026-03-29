/**
 * Display labels for project_members rows (server-side).
 * Prefer profile + CRM contact; for team users fall back to tenant_users (same sources as /api/directory).
 */

import type { ProjectMember } from "@/lib/supabase/projects";
import { getContactsByIds } from "@/lib/supabase/crm";
import { getProfilesByUserIds } from "@/lib/supabase/profiles";
import { getTenantUserById, getTenantUsersByAuthUserIds } from "@/lib/supabase/tenant-users";
import { batchUserAvatarInitials } from "@/lib/people/batch-avatar-initials";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";

function uniq(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id?.trim())))];
}

/**
 * Map `project_members.id` → display label for each member row.
 */
export async function getProjectMemberDisplayLabelMap(
  members: ProjectMember[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (members.length === 0) return result;

  const contactIds = uniq(members.map((m) => m.contact_id));
  const userIds = uniq(members.map((m) => m.user_id));

  const [contacts, profiles, tenantByAuth] = await Promise.all([
    contactIds.length > 0 ? getContactsByIds(contactIds) : Promise.resolve([]),
    userIds.length > 0 ? getProfilesByUserIds(userIds) : Promise.resolve([]),
    userIds.length > 0 ? getTenantUsersByAuthUserIds(userIds) : Promise.resolve([]),
  ]);

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const profileByUserId = new Map(profiles.map((p) => [p.user_id, p]));
  const tenantAuthByUserId = new Map(
    tenantByAuth.filter((t) => t.user_id).map((t) => [t.user_id as string, t])
  );

  const needTenantPkFallback: ProjectMember[] = [];

  for (const m of members) {
    if (m.contact_id) {
      const c = contactById.get(m.contact_id);
      result.set(
        m.id,
        c?.full_name?.trim() || c?.email?.trim() || "Contact"
      );
      continue;
    }
    if (m.user_id) {
      const p = profileByUserId.get(m.user_id);
      const t = tenantAuthByUserId.get(m.user_id);
      const name =
        p?.display_name?.trim() || t?.display_name?.trim() || t?.email?.trim();
      if (name) {
        result.set(m.id, name);
      } else {
        needTenantPkFallback.push(m);
      }
      continue;
    }
    result.set(m.id, "—");
  }

  if (needTenantPkFallback.length > 0) {
    const fallbackUids = [...new Set(needTenantPkFallback.map((m) => m.user_id!))];
    const tenantPkByLookupUid = new Map(
      (
        await Promise.all(
          fallbackUids.map(async (uid) => [uid, await getTenantUserById(uid)] as const)
        )
      ).map(([uid, tu]) => [uid, tu])
    );
    for (const m of needTenantPkFallback) {
      const tu = tenantPkByLookupUid.get(m.user_id!);
      result.set(
        m.id,
        tu?.display_name?.trim() || tu?.email?.trim() || "Team member"
      );
    }
  }

  return result;
}

/**
 * Avatar initials per `project_members.id` (CRM first+last / profile custom fields + email).
 */
export async function getProjectMemberAvatarInitialsMap(
  members: ProjectMember[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (members.length === 0) return result;

  const contactIds = uniq(members.map((m) => m.contact_id));
  const userIds = uniq(members.map((m) => m.user_id));

  const [contacts, userInitialsByAuthId] = await Promise.all([
    contactIds.length > 0 ? getContactsByIds(contactIds) : Promise.resolve([]),
    userIds.length > 0 ? batchUserAvatarInitials(userIds) : Promise.resolve(new Map<string, string>()),
  ]);

  const contactById = new Map(contacts.map((c) => [c.id, c]));

  for (const m of members) {
    if (m.contact_id) {
      const c = contactById.get(m.contact_id);
      result.set(
        m.id,
        c ? initialsFromFirstLast(c.first_name, c.last_name, c.email) : "?"
      );
      continue;
    }
    if (m.user_id) {
      result.set(m.id, userInitialsByAuthId.get(m.user_id) ?? "?");
      continue;
    }
    result.set(m.id, "?");
  }

  return result;
}
