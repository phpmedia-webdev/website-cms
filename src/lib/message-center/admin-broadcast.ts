/**
 * Admin Message Center — broadcast to MAG group rooms and staff inboxes (timeline).
 */

import {
  getOrCreateMagGroupThread,
  insertThreadMessage,
} from "@/lib/supabase/conversation-threads";
import { insertContactNotificationsTimeline } from "@/lib/supabase/contact-notifications-timeline";
import { assertCanPostThreadMessage } from "@/lib/message-center/mag-thread-policy";
import { getMags, listRegisteredMemberContactIdsWithoutMagEnrollment } from "@/lib/supabase/crm";
import { createServerSupabaseClient } from "@/lib/supabase/server-service";
import { getClientSchema } from "@/lib/supabase/schema";

function titleFromBody(body: string): string {
  const line = body.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return "Broadcast";
  if (line.length > 200) return `${line.slice(0, 197)}…`;
  return line;
}

export type ExecuteAdminBroadcastInput = {
  body: string;
  authorUserId: string;
  /** Post to every MAG group room (tenant). */
  allMags: boolean;
  /** Specific MAG ids (merged with allMags when both set — caller should avoid overlap). */
  magIds: string[];
  /** Auth user ids — timeline rows (admin-only) for staff Message Center. */
  teamUserIds: string[];
};

export type ExecuteAdminBroadcastResult = {
  magThreadsPosted: number;
  teamInboxRows: number;
  /** Client-visible timeline rows for registered members not in any MAG (`allMags` only). */
  memberPortalRows: number;
  errors: string[];
};

export async function executeAdminBroadcast(
  input: ExecuteAdminBroadcastInput
): Promise<ExecuteAdminBroadcastResult> {
  const text = input.body.trim();
  const errors: string[] = [];
  let magThreadsPosted = 0;
  let teamInboxRows = 0;

  if (!text) {
    return { magThreadsPosted: 0, teamInboxRows: 0, memberPortalRows: 0, errors: ["Message is required"] };
  }

  let memberPortalRows = 0;
  const magIdSet = new Set<string>(input.magIds.map((id) => id.trim()).filter(Boolean));

  if (input.allMags) {
    const mags = await getMags(false);
    for (const m of mags) {
      if (m?.id) magIdSet.add(String(m.id).trim());
    }
  }

  const uniqueMagIds = [...magIdSet];

  for (const magId of uniqueMagIds) {
    const { thread, error: tErr } = await getOrCreateMagGroupThread(magId);
    if (tErr || !thread) {
      errors.push(`MAG ${magId}: ${tErr?.message ?? "no thread"}`);
      continue;
    }
    const gate = await assertCanPostThreadMessage({
      threadId: thread.id,
      authorUserId: input.authorUserId,
      authorContactId: null,
    });
    if (!gate.ok) {
      errors.push(`MAG ${magId}: ${gate.message}`);
      continue;
    }
    const { message, error: mErr } = await insertThreadMessage({
      thread_id: thread.id,
      body: text,
      author_user_id: input.authorUserId,
      author_contact_id: null,
      metadata: { source: "admin_broadcast", mag_id: magId },
    });
    if (mErr || !message) {
      errors.push(`MAG ${magId}: ${mErr?.message ?? "post failed"}`);
      continue;
    }
    magThreadsPosted += 1;
  }

  const uniqueTeam = [...new Set(input.teamUserIds.map((id) => id.trim()).filter(Boolean))];
  for (const uid of uniqueTeam) {
    const { row, error } = await insertContactNotificationsTimeline({
      contact_id: null,
      kind: "staff_note",
      visibility: "admin_only",
      title: titleFromBody(text),
      body: text,
      metadata: {
        note_type: "staff_note",
        team_broadcast: true,
      },
      author_user_id: input.authorUserId,
      recipient_user_id: uid,
      source_event: null,
    });
    if (error || !row) {
      errors.push(`Team ${uid}: ${error?.message ?? "timeline insert failed"}`);
      continue;
    }
    teamInboxRows += 1;
  }

  if (input.allMags) {
    const noMagContacts = await listRegisteredMemberContactIdsWithoutMagEnrollment();
    if (noMagContacts.length > 0) {
      const title = titleFromBody(text);
      const supabase = createServerSupabaseClient();
      const schema = getClientSchema();
      const batchSize = 150;
      for (let i = 0; i < noMagContacts.length; i += batchSize) {
        const chunk = noMagContacts.slice(i, i + batchSize);
        const rows = chunk.map((contact_id) => ({
          contact_id,
          kind: "message",
          visibility: "client_visible" as const,
          title,
          body: text,
          metadata: {
            note_type: "tenant_announcement",
            tenant_wide_broadcast: true,
          },
          author_user_id: input.authorUserId,
          recipient_user_id: null,
          subject_type: null,
          subject_id: null,
          source_event: "tenant_broadcast",
        }));
        const { error } = await supabase.schema(schema).from("contact_notifications_timeline").insert(rows);
        if (error) {
          errors.push(`Member portal broadcast: ${error.message}`);
          break;
        }
        memberPortalRows += chunk.length;
      }
    }
  }

  return { magThreadsPosted, teamInboxRows, memberPortalRows, errors };
}
