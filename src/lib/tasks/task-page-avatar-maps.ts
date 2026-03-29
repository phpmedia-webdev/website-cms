import { batchUserAvatarInitials } from "@/lib/people/batch-avatar-initials";
import { getContactsByIds } from "@/lib/supabase/crm";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";

/**
 * Batch-resolve avatar initials for task detail/edit (time logs + discussion authors).
 * Uses structured names for people, not display labels.
 */
export async function resolveTaskPageAvatarMaps(options: {
  timeLogUserIds: string[];
  timeLogContactIds: string[];
  noteAuthorUserIds: string[];
}): Promise<{
  timeLogUserInitials: Record<string, string>;
  timeLogContactInitials: Record<string, string>;
  authorAvatarInitials: Record<string, string>;
}> {
  const userSet = new Set<string>();
  for (const id of options.timeLogUserIds) {
    if (id?.trim()) userSet.add(id.trim());
  }
  for (const id of options.noteAuthorUserIds) {
    if (id?.trim()) userSet.add(id.trim());
  }
  const userIds = [...userSet];
  const contactIds = [...new Set(options.timeLogContactIds.filter((id) => id?.trim()))];

  const [userMap, contacts] = await Promise.all([
    userIds.length > 0 ? batchUserAvatarInitials(userIds) : Promise.resolve(new Map<string, string>()),
    contactIds.length > 0 ? getContactsByIds(contactIds) : Promise.resolve([]),
  ]);

  const timeLogUserInitials: Record<string, string> = {};
  for (const id of options.timeLogUserIds) {
    const k = id?.trim();
    if (k) timeLogUserInitials[k] = userMap.get(k) ?? "?";
  }

  const authorAvatarInitials: Record<string, string> = {};
  for (const id of options.noteAuthorUserIds) {
    const k = id?.trim();
    if (k) authorAvatarInitials[k] = userMap.get(k) ?? "?";
  }

  const timeLogContactInitials: Record<string, string> = {};
  for (const c of contacts) {
    timeLogContactInitials[c.id] = initialsFromFirstLast(c.first_name, c.last_name, c.email);
  }

  return { timeLogUserInitials, timeLogContactInitials, authorAvatarInitials };
}
