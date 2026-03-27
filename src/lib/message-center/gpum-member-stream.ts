/**
 * GPUM merged message-center stream: activity rows + conversation heads.
 */

import {
  getMemberActivity,
  getContactMags,
  type DashboardActivityItem,
  type ContactMag,
} from "@/lib/supabase/crm";
import {
  listSupportThreadsForContact,
  listMagGroupThreadsForMagIds,
  fetchLatestThreadMessagesForThreads,
} from "@/lib/supabase/conversation-threads";
import { memberCanSeeMagGroupThread } from "@/lib/message-center/gpum-mag-eligibility";
import {
  buildMemberStreamItemsFromActivity,
  type MemberMessageCenterStreamItem,
} from "@/lib/message-center/gpum-message-center";

const SUPPORT_HEAD_CAP = 8;
const FETCH_ACTIVITY_CAP = 160;

export type MemberMergedStreamOptions = {
  /** Wider timeline/order fetch so date-range filters can show older items. */
  dateRangeActive?: boolean;
};

async function buildConversationHeads(
  contactId: string,
  authUserId: string,
  mags: ContactMag[]
): Promise<MemberMessageCenterStreamItem[]> {
  const heads: MemberMessageCenterStreamItem[] = [];

  const supportThreads = await listSupportThreadsForContact(contactId);
  const supportSlice = supportThreads.slice(0, SUPPORT_HEAD_CAP);
  const supportIds = supportSlice.map((t) => t.id);
  const lastSupport = await fetchLatestThreadMessagesForThreads(supportIds);
  for (const t of supportSlice) {
    const last = lastSupport.get(t.id);
    heads.push({
      kind: "conversation_head",
      id: `head-support-${t.id}`,
      at: last?.created_at ?? t.updated_at,
      title: "Support",
      preview: last?.body?.trim() || "(no messages yet)",
      threadId: t.id,
      threadType: "support",
      magId: null,
    });
  }

  const eligibleMagIds: string[] = [];
  for (const m of mags) {
    const mid = m.mag_id?.trim();
    if (!mid) continue;
    if (await memberCanSeeMagGroupThread(contactId, authUserId, mid)) {
      eligibleMagIds.push(mid);
    }
  }

  if (eligibleMagIds.length > 0) {
    const magThreads = await listMagGroupThreadsForMagIds(eligibleMagIds);
    const onePerMag = new Map<string, (typeof magThreads)[0]>();
    for (const row of magThreads) {
      const mid = row.mag_id?.trim();
      if (!mid || onePerMag.has(mid)) continue;
      onePerMag.set(mid, row);
    }
    const magThreadList = [...onePerMag.values()];
    const magTids = magThreadList.map((r) => r.id);
    const lastMag = await fetchLatestThreadMessagesForThreads(magTids);
    for (const t of magThreadList) {
      const last = lastMag.get(t.id);
      const magName = mags.find((x) => x.mag_id === t.mag_id)?.mag_name ?? "MAG";
      heads.push({
        kind: "conversation_head",
        id: `head-mag-${t.id}`,
        at: last?.created_at ?? t.updated_at,
        title: magName,
        preview: last?.body?.trim() || "(no messages yet)",
        threadId: t.id,
        threadType: "mag_group",
        magId: t.mag_id,
      });
    }
  }

  return heads;
}

export async function getMemberMessageCenterMergedStream(
  contactId: string,
  authUserId: string,
  limit: number,
  options?: MemberMergedStreamOptions
): Promise<{
  activity: DashboardActivityItem[];
  streamItems: MemberMessageCenterStreamItem[];
}> {
  const cap = Math.min(Math.max(limit, 1), 200);
  const mags = await getContactMags(contactId);
  const wide = !!options?.dateRangeActive;
  const activitySliceCap = wide
    ? Math.min(500, Math.max(cap * 4, 200))
    : Math.min(FETCH_ACTIVITY_CAP, cap * 3);
  const activity = await getMemberActivity(
    contactId,
    activitySliceCap,
    wide
      ? { timelineFetchLimit: 450, ordersFetchLimit: 100 }
      : undefined
  );
  const heads = await buildConversationHeads(contactId, authUserId, mags);
  /** Same idea as admin `contactIdsWithSupportThreadInStream`: support thread bodies already roll up in `conversation_head`. */
  const hasSupportThreadHead = heads.some(
    (h) => h.kind === "conversation_head" && h.threadType === "support"
  );
  let fromActivity = buildMemberStreamItemsFromActivity(activity);
  if (hasSupportThreadHead) {
    fromActivity = fromActivity.filter(
      (i) =>
        !(
          i.kind === "notification" &&
          i.sourceType === "message" &&
          i.sourceNoteType === "message"
        )
    );
  }
  const merged = [...fromActivity, ...heads].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const allMagIds = [...new Set(mags.map((m) => m.mag_id).filter(Boolean))] as string[];
  const threadsForMags =
    allMagIds.length > 0 ? await listMagGroupThreadsForMagIds(allMagIds) : [];
  const threadIdByMag = new Map<string, string>();
  for (const row of threadsForMags) {
    const mid = row.mag_id?.trim();
    if (mid && !threadIdByMag.has(mid)) {
      threadIdByMag.set(mid, row.id);
    }
  }
  for (const item of merged) {
    if (item.kind === "announcement_feed" && item.magId) {
      const tid = threadIdByMag.get(item.magId.trim());
      if (tid) item.threadId = tid;
    }
  }

  return {
    activity,
    streamItems: merged.slice(0, Math.min(merged.length, wide ? cap * 3 : cap * 2)),
  };
}
