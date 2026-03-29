import { getContactsByIds, formatCrmContactDisplayName } from "@/lib/supabase/crm";
import { resolveAssigneeLabelsForUserIds } from "@/lib/tasks/admin-task-list";
import { batchUserAvatarInitials } from "@/lib/people/batch-avatar-initials";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import type { TaskFollower } from "@/lib/supabase/projects";
import type { TaskFollowerWithLabel } from "@/lib/tasks/task-follower-types";

function uniq(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id?.trim())))];
}

/** Resolve display labels and avatar initials for task_followers rows (server). */
export async function resolveTaskFollowersWithLabels(
  followers: TaskFollower[]
): Promise<TaskFollowerWithLabel[]> {
  const contactIds = uniq(followers.map((f) => f.contact_id));
  const userIds = uniq(followers.map((f) => f.user_id));

  const [contacts, userLabelById, userInitialsById] = await Promise.all([
    contactIds.length > 0 ? getContactsByIds(contactIds) : Promise.resolve([]),
    userIds.length > 0 ? resolveAssigneeLabelsForUserIds(userIds) : Promise.resolve(new Map<string, string>()),
    userIds.length > 0 ? batchUserAvatarInitials(userIds) : Promise.resolve(new Map<string, string>()),
  ]);

  const contactById = new Map(contacts.map((c) => [c.id, c]));

  return followers.map((f) => {
    if (f.contact_id) {
      const contact = contactById.get(f.contact_id);
      return {
        id: f.id,
        role: f.role,
        contact_id: f.contact_id,
        user_id: f.user_id,
        label: contact ? formatCrmContactDisplayName(contact) : "Contact",
        avatar_initials: contact
          ? initialsFromFirstLast(contact.first_name, contact.last_name, contact.email)
          : "?",
      };
    }
    if (f.user_id) {
      return {
        id: f.id,
        role: f.role,
        contact_id: f.contact_id,
        user_id: f.user_id,
        label: userLabelById.get(f.user_id) ?? "User",
        avatar_initials: userInitialsById.get(f.user_id) ?? "?",
      };
    }
    return {
      id: f.id,
      role: f.role,
      contact_id: f.contact_id,
      user_id: f.user_id,
      label: "—",
      avatar_initials: "?",
    };
  });
}
