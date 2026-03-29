/**
 * GPUM merged message-center stream: activity rows + conversation heads.
 */

import {
  getMemberActivity,
  getContactMags,
  getMags,
  type DashboardActivityItem,
  type ContactMag,
} from "@/lib/supabase/crm";
import {
  listSupportThreadsForContact,
  listMagGroupThreadsForMagIds,
  getOrCreateMagGroupThread,
  fetchLatestThreadMessagesForThreads,
  getMemberThreadUnreadMapForUser,
  type ThreadLastMessagePreview,
} from "@/lib/supabase/conversation-threads";
import { memberCanSeeMagGroupCommentHead } from "@/lib/message-center/gpum-mag-eligibility";
import {
  buildMemberStreamItemsFromActivity,
  compareMemberStreamItemsNewestFirst,
  type MemberMessageCenterStreamItem,
} from "@/lib/message-center/gpum-message-center";

const SUPPORT_HEAD_CAP = 8;
const FETCH_ACTIVITY_CAP = 160;

/** GPUM perspective: last message from a contact vs staff user (for list line labels). */
function gpumLastMessageFrom(last: ThreadLastMessagePreview | undefined): "member" | "staff" | "none" {
  if (!last) return "none";
  if (last.author_user_id?.trim()) return "staff";
  if (last.author_contact_id?.trim()) return "member";
  return "none";
}

export type MemberMergedStreamOptions = {
  /** Wider timeline/order fetch so date-range filters can show older items. */
  dateRangeActive?: boolean;
  /** Max merged stream rows returned (activity + heads); supports GPUM cursor pages within this window. */
  streamMergeMax?: number;
};

async function buildConversationHeads(
  contactId: string,
  authUserId: string,
  mags: ContactMag[],
  allowConversationsByMagId: Map<string, boolean>
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
      title: "Message",
      preview: last?.body?.trim() || "(no messages yet)",
      threadId: t.id,
      threadType: "support",
      magId: null,
    });
  }

  const eligibleMagIds: string[] = [];
  const seenMag = new Set<string>();
  for (const m of mags) {
    const mid = m.mag_id?.trim();
    if (!mid || seenMag.has(mid)) continue;
    const allow =
      allowConversationsByMagId.get(mid) === undefined || allowConversationsByMagId.get(mid) === true;
    if (!(await memberCanSeeMagGroupCommentHead(contactId, mid, allow))) continue;
    seenMag.add(mid);
    eligibleMagIds.push(mid);
  }

  let lastMag = new Map<string, ThreadLastMessagePreview>();
  if (eligibleMagIds.length > 0) {
    const magThreads = await listMagGroupThreadsForMagIds(eligibleMagIds);
    const onePerMag = new Map<string, (typeof magThreads)[0]>();
    for (const row of magThreads) {
      const mid = row.mag_id?.trim();
      if (!mid || onePerMag.has(mid)) continue;
      onePerMag.set(mid, row);
    }
    const missingMagIds = eligibleMagIds.filter((mid) => !onePerMag.has(mid));
    await Promise.all(
      missingMagIds.map(async (mid) => {
        const { thread } = await getOrCreateMagGroupThread(mid);
        if (thread) onePerMag.set(mid, thread);
      })
    );
    const magThreadList = [...onePerMag.values()];
    const magTids = magThreadList.map((r) => r.id);
    lastMag = await fetchLatestThreadMessagesForThreads(magTids);
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
        lastMessageFrom: gpumLastMessageFrom(last),
      });
    }
  }

  const lastByThread = new Map<string, ThreadLastMessagePreview>();
  for (const t of supportSlice) {
    const m = lastSupport.get(t.id);
    if (m) lastByThread.set(t.id, m);
  }
  for (const [tid, preview] of lastMag) {
    lastByThread.set(tid, preview);
  }
  const headThreadIds = heads
    .filter((h): h is Extract<MemberMessageCenterStreamItem, { kind: "conversation_head" }> => h.kind === "conversation_head")
    .map((h) => h.threadId);
  const unreadMap = await getMemberThreadUnreadMapForUser(authUserId, contactId, headThreadIds, lastByThread);
  for (const h of heads) {
    if (h.kind === "conversation_head") {
      h.unread = unreadMap.get(h.threadId) ?? false;
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
  const mergeMax = Math.min(Math.max(options?.streamMergeMax ?? 480, cap), 600);
  const mags = await getContactMags(contactId);
  const tenantMags = await getMags(false);
  const allowConversationsByMagId = new Map(
    tenantMags.map((m) => [m.id.trim(), m.allow_conversations !== false])
  );
  const wide = !!options?.dateRangeActive;
  const activitySliceCap = wide
    ? Math.min(500, Math.max(mergeMax, cap * 4, 200))
    : Math.min(Math.max(mergeMax, FETCH_ACTIVITY_CAP), Math.max(cap * 3, mergeMax));
  const activity = await getMemberActivity(
    contactId,
    activitySliceCap,
    wide
      ? { timelineFetchLimit: 450, ordersFetchLimit: 100 }
      : undefined
  );
  const heads = await buildConversationHeads(contactId, authUserId, mags, allowConversationsByMagId);
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
  const merged = [...fromActivity, ...heads].sort((a, b) =>
    compareMemberStreamItemsNewestFirst(a, b)
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
      const mid = item.magId.trim();
      if (mid && allowConversationsByMagId.get(mid) === false) {
        item.announcementsOnly = true;
      }
    }
  }

  return {
    activity,
    streamItems: merged.slice(0, Math.min(merged.length, mergeMax)),
  };
}
