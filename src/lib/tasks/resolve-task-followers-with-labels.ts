import { getContactById, formatCrmContactDisplayName } from "@/lib/supabase/crm";
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import type { TaskFollower } from "@/lib/supabase/projects";
import type { TaskFollowerWithLabel } from "@/lib/tasks/task-follower-types";

/** Resolve display labels for task_followers rows (server). */
export async function resolveTaskFollowersWithLabels(
  followers: TaskFollower[]
): Promise<TaskFollowerWithLabel[]> {
  return Promise.all(
    followers.map(async (f) => {
      if (f.contact_id) {
        const contact = await getContactById(f.contact_id);
        return {
          id: f.id,
          role: f.role,
          contact_id: f.contact_id,
          user_id: f.user_id,
          label: contact ? formatCrmContactDisplayName(contact) : "Contact",
        };
      }
      if (f.user_id) {
        const label = await getDisplayLabelForUser(f.user_id);
        return {
          id: f.id,
          role: f.role,
          contact_id: f.contact_id,
          user_id: f.user_id,
          label,
        };
      }
      return {
        id: f.id,
        role: f.role,
        contact_id: f.contact_id,
        user_id: f.user_id,
        label: "—",
      };
    })
  );
}
