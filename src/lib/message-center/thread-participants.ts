/**
 * Pattern A: new support / task_ticket threads auto-add all tenant admin-team user_ids as participants
 * so everyone sees unread in Message Center.
 */

import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getClientSchema } from "@/lib/supabase/schema";
import { listAuthUserIdsAssignedToTenantSite } from "@/lib/supabase/tenant-users";
import { addThreadParticipantIfNotExists } from "@/lib/supabase/conversation-threads";

export async function seedSupportTaskThreadParticipantsForAdmins(
  threadId: string
): Promise<void> {
  try {
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (!site?.id) return;
    const userIds = await listAuthUserIdsAssignedToTenantSite(site.id);
    await Promise.all(
      userIds.map((userId) =>
        addThreadParticipantIfNotExists({ thread_id: threadId, user_id: userId, role: "admin_cohort" })
      )
    );
  } catch (e) {
    console.error("seedSupportTaskThreadParticipantsForAdmins:", e);
  }
}
