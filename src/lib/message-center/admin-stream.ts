/**
 * Admin Message Center: unified stream (conversation thread heads + contact_notifications_timeline).
 */

import {
  listRecentContactNotificationsTimelineGlobal,
  listContactNotificationsTimeline,
  parseTimelineMetadataJson,
  timelineRowIsNoteToSelfForViewer,
} from "@/lib/supabase/contact-notifications-timeline";
import type { ContactNotificationsTimelineRow } from "@/lib/supabase/contact-notifications-timeline";
import {
  listRecentConversationThreadsForAdmin,
  listRecentMagGroupThreadMessagesForStream,
  listSupportThreadsForContact,
  listTaskTicketThreadsForTaskIds,
  listThreadMessages,
  fetchLatestThreadMessagesForThreads,
  getThreadUnreadMapForUser,
  type ConversationThreadType,
} from "@/lib/supabase/conversation-threads";
import { getTaskIdsForContact } from "@/lib/supabase/projects";
import { getCommentAuthorDisplayName, getRealNameLabelForUser } from "@/lib/blog-comments/author-name";
import { createServerSupabaseClient } from "@/lib/supabase/server-service";
import { getClientSchema } from "@/lib/supabase/schema";
import {
  normalizeMessageCenterDateRange,
  messageCenterFetchCap,
  messageCenterItemInDateRange,
  type MessageCenterDateRangeIso,
} from "@/lib/message-center/date-range";

const CRM_SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type MessageCenterStreamFilter =
  | "all"
  | "conversations"
  | "comments"
  | "notes"
  | "requires_moderation"
  | "notifications"
  | "notification_timeline"
  | "blog_comment"
  | "form_submission"
  | "form_submitted"
  | "contact_added"
  | "mag_assignment"
  | "marketing_list"
  | "order"
  | "support"
  | "task_ticket"
  | "mag_group"
  | "direct"
  | "group";

/** Normalize timeline kind for display / customizer (form_submitted canonical). */
export function normalizeTimelineKindForMessageCenter(kind: string): string {
  const k = (kind ?? "").trim();
  if (k === "form_submission") return "form_submitted";
  return k;
}

function moderationStatusFromCommentMetadata(
  metadata: Record<string, unknown> | null | undefined
): "pending" | "approved" | "rejected" {
  const v =
    metadata?.blog_moderation_status ??
    metadata?.product_moderation_status ??
    metadata?.moderation_status;
  if (v === "approved" || v === "rejected" || v === "pending") return v;
  return "pending";
}

export type MessageCenterStreamItem =
  | {
      source: "thread";
      id: string;
      at: string;
      /** thread_type */
      threadType: ConversationThreadType;
      threadId: string;
      magId: string | null;
      subjectType: string | null;
      subjectId: string | null;
      preview: string;
      /** For task_ticket / support — link hints */
      taskId: string | null;
      contactId: string;
      contactName: string;
      authorLabel: string | null;
      /** Support rollup only: last message from contact (IN) vs staff (OUT). */
      supportRollupDirection?: "in" | "out";
      /** Present when `forUserId` was passed to stream builder — thread has newer messages than `last_read_at`. */
      unread?: boolean;
      /** Admin MAG announcement (`thread_messages.metadata.source` = admin_broadcast). */
      broadcast?: boolean;
    }
  | {
      source: "timeline";
      id: string;
      at: string;
      timelineKind: string;
      displayKind: string;
      contactId: string;
      contactName: string;
      body: string;
      /** True when row came from `contact_notifications_timeline` (not blog or synthesized CRM events). */
      nativeDbTimeline?: boolean;
      contentId?: string | null;
      status?: string | null;
      formName?: string;
      /** When timeline kind is form submission — for deep link to Form Submissions. */
      formId?: string | null;
      submissionId?: string | null;
      magName?: string;
      listName?: string;
      orderId?: string;
      orderStatus?: string;
      taskId?: string | null;
      /** From timeline metadata — personal scratch notes (dashboard) visible only to author/recipient. */
      noteScope?: "note_to_self" | null;
      /** Staff team inbox announcement (`metadata.team_broadcast`). */
      teamBroadcast?: boolean;
    };

/** Map dashboard / URL filter to internal handling. */
function timelineKindMatchesFilter(
  row: ContactNotificationsTimelineRow,
  filter: MessageCenterStreamFilter
): boolean {
  if (filter === "form_submission" || filter === "form_submitted") {
    const k = normalizeTimelineKindForMessageCenter(row.kind);
    return k === "form_submitted";
  }
  if (filter === "notification_timeline") return true;
  return row.kind === filter;
}

function threadTypeMatchesFilter(
  threadType: ConversationThreadType,
  filter: MessageCenterStreamFilter
): boolean {
  if (filter === "conversations") return true;
  return threadType === filter;
}

function normalizeMessageCenterContactId(id: string | null | undefined): string {
  return (id ?? "").trim().toLowerCase();
}

/** True for DB `kind` values that are internal staff / note rows on the contact timeline. */
export function streamTimelineKindIsStaffNoteOrNote(kind: string | undefined | null): boolean {
  const k = (kind ?? "").trim().toLowerCase();
  return k === "staff_note" || k === "note";
}

/** Contact-scoped Message Center: row involves this CRM contact (v1 — direct `contact_id` / task / support subject). */
export function messageCenterItemInvolvesContact(item: MessageCenterStreamItem, contactId: string): boolean {
  const want = normalizeMessageCenterContactId(contactId);
  if (!want) return true;
  if (item.source === "thread" || item.source === "timeline") {
    return normalizeMessageCenterContactId(item.contactId) === want;
  }
  return false;
}

function passesFilter(item: MessageCenterStreamItem, filter: MessageCenterStreamFilter): boolean {
  if (filter === "all") return true;
  if (filter === "conversations") return item.source === "thread";
  if (filter === "comments") {
    if (item.source === "thread") {
      return item.threadType === "task_ticket";
    }
    return (
      item.source === "timeline" &&
      (item.timelineKind === "blog_comment" || item.timelineKind === "product_comment")
    );
  }
  if (filter === "requires_moderation") {
    return (
      item.source === "timeline" &&
      (item.timelineKind === "blog_comment" || item.timelineKind === "product_comment") &&
      item.status === "pending"
    );
  }
  if (filter === "notes") {
    return item.source === "timeline" && streamTimelineKindIsStaffNoteOrNote(item.timelineKind);
  }
  if (filter === "notifications") return item.source === "timeline";
  if (filter === "notification_timeline") {
    return item.source === "timeline" && item.nativeDbTimeline === true;
  }
  if (filter === "blog_comment") {
    return item.source === "timeline" && item.timelineKind === "blog_comment";
  }
  if (item.source === "thread") {
    return threadTypeMatchesFilter(item.threadType, filter);
  }
  if (item.source === "timeline") {
    return timelineKindMatchesFilter(
      {
        id: item.id,
        contact_id: item.contactId,
        kind: item.timelineKind,
        visibility: "admin_only",
        title: "",
        body: item.body,
        metadata: {},
        author_user_id: null,
        recipient_user_id: null,
        subject_type: null,
        subject_id: null,
        source_event: null,
        read_at: null,
        dismissed_at: null,
        created_at: item.at,
      },
      filter
    );
  }
  return true;
}

/**
 * Admin Message Center search: match older GPUM lines, not only `preview` (latest).
 * Runs for global dashboard + full MC + contact-scoped. Batched to limit concurrent DB reads.
 */
async function enrichSupportThreadSearchText(
  items: MessageCenterStreamItem[]
): Promise<MessageCenterStreamItem[]> {
  const supportThreadIds = items
    .filter(
      (item): item is Extract<MessageCenterStreamItem, { source: "thread" }> =>
        item.source === "thread" && item.threadType === "support"
    )
    .map((item) => item.threadId);
  const uniqueIds = [...new Set(supportThreadIds)];
  const BATCH = 15;
  const blobByThreadId = new Map<string, string>();
  for (let i = 0; i < uniqueIds.length; i += BATCH) {
    const chunk = uniqueIds.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (threadId) => {
        const msgs = await listThreadMessages(threadId, { limit: 100 });
        const blob = msgs
          .map((m) => (m.body ?? "").trim())
          .filter(Boolean)
          .join("\n")
          .slice(0, 12000);
        blobByThreadId.set(threadId, blob);
      })
    );
  }
  return items.map((item) => {
    if (item.source !== "thread" || item.threadType !== "support") return item;
    const blob = blobByThreadId.get(item.threadId);
    if (blob == null) return item;
    return { ...item, threadSearchText: blob };
  });
}

export type GetAdminMessageCenterStreamOptions = {
  /** When set, only rows involving this CRM contact (after merge). */
  contactId?: string | null;
  /** When set, thread rows include `unread` for this auth user. */
  forUserId?: string | null;
  /** Inclusive window (`YYYY-MM-DD` or ISO). Both ends optional (open range). */
  dateFrom?: string | null;
  dateTo?: string | null;
};

/**
 * Build unified admin Message Center list (thread heads + timeline), sorted newest first.
 */
export async function getAdminMessageCenterStream(
  limit: number,
  filter: MessageCenterStreamFilter = "all",
  options?: GetAdminMessageCenterStreamOptions
): Promise<MessageCenterStreamItem[]> {
  const viewerUserId = options?.forUserId?.trim() ?? "";
  const contactScope = !!options?.contactId?.trim();
  const scopeMult = contactScope ? 4 : 1;
  const rangeIso: MessageCenterDateRangeIso | null = normalizeMessageCenterDateRange(
    options?.dateFrom,
    options?.dateTo
  );

  const perKind = messageCenterFetchCap(Math.max(20, Math.ceil(limit * 0.6 * scopeMult)), rangeIso);
  /** Contact-scoped views need a larger global timeline window so rows not returned by merge still appear when volume is high. */
  const perKindEffective = contactScope ? Math.max(perKind, 320) : perKind;
  const threadCap = messageCenterFetchCap(Math.max(20, Math.ceil(limit * 0.55 * scopeMult)), rangeIso);
  const blogLimit = messageCenterFetchCap(Math.ceil(limit / 2), rangeIso);

  const scopedContactId = options?.contactId?.trim() ?? "";

  const [globalThreads, timelineRowsGlobal, blogRows, productRows, supportThreads, taskIdsForContact, timelineForContact] =
    await Promise.all([
    listRecentConversationThreadsForAdmin(threadCap, rangeIso),
    listRecentContactNotificationsTimelineGlobal(perKindEffective, rangeIso),
    import("@/lib/supabase/blog-comment-messages").then((m) =>
      m.fetchRecentBlogCommentRowsForDashboard(blogLimit, rangeIso)
    ),
    (async () => {
      type ProductJoinRow = {
        id: string;
        body: string;
        created_at: string;
        author_user_id: string | null;
        metadata: Record<string, unknown> | null;
        conversation_threads:
          | { thread_type: string; subject_id: string | null }
          | { thread_type: string; subject_id: string | null }[]
          | null;
      };
      const supabase = createServerSupabaseClient();
      const schema = getClientSchema();
      let q = supabase
        .schema(schema)
        .from("thread_messages")
        .select(
          `
          id,
          body,
          created_at,
          author_user_id,
          metadata,
          conversation_threads!inner (
            thread_type,
            subject_id
          )
        `
        )
        .eq("conversation_threads.thread_type", "product_comment");
      if (rangeIso?.dateFrom) q = q.gte("created_at", rangeIso.dateFrom);
      if (rangeIso?.dateTo) q = q.lte("created_at", rangeIso.dateTo);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(blogLimit);
      if (error) {
        console.error("fetchRecentProductCommentRowsForDashboard:", error.message, error.code);
        return [] as {
          id: string;
          body: string;
          created_at: string;
          author_user_id: string | null;
          metadata: Record<string, unknown> | null;
          product_id: string | null;
        }[];
      }
      const rows = ((data ?? []) as ProductJoinRow[]).map((row) => {
        const th = Array.isArray(row.conversation_threads)
          ? row.conversation_threads[0]
          : row.conversation_threads;
        return {
          id: row.id,
          body: row.body,
          created_at: row.created_at,
          author_user_id: row.author_user_id,
          metadata: row.metadata,
          product_id: th?.subject_id ?? null,
        };
      });
      return rows;
    })(),
    scopedContactId ? listSupportThreadsForContact(scopedContactId) : Promise.resolve([]),
    scopedContactId ? getTaskIdsForContact(scopedContactId) : Promise.resolve([]),
    scopedContactId
      ? listContactNotificationsTimeline(scopedContactId, { limit: 200 })
      : Promise.resolve([]),
  ]);

  let timelineRows: ContactNotificationsTimelineRow[] = timelineRowsGlobal;
  if (scopedContactId) {
    const byId = new Map<string, ContactNotificationsTimelineRow>();
    for (const r of timelineRowsGlobal) byId.set(r.id, r);
    for (const r of timelineForContact) byId.set(r.id, r);
    timelineRows = [...byId.values()];
  }

  const taskTicketThreads =
    scopedContactId && taskIdsForContact.length > 0
      ? await listTaskTicketThreadsForTaskIds(taskIdsForContact)
      : [];

  const threadsById = new Map<string, (typeof globalThreads)[number]>();
  for (const t of globalThreads) threadsById.set(t.id, t);
  for (const t of supportThreads) threadsById.set(t.id, t);
  for (const t of taskTicketThreads) threadsById.set(t.id, t);
  const threads = [...threadsById.values()];
  const magGroupThreads = threads.filter((t) => t.thread_type === "mag_group");

  /** Threads explicitly tied to this contact (direct subject, orphans, author lookup). */
  const supportThreadIdsForScope = new Set(supportThreads.map((x) => x.id));

  const threadIdsForLatestPreview = threads
    .filter((t) => t.thread_type !== "mag_group")
    .map((t) => t.id);
  const lastByThread = await fetchLatestThreadMessagesForThreads(threadIdsForLatestPreview);

  const magMsgCap = messageCenterFetchCap(Math.min(750, Math.max(limit * 6, 160)), rangeIso);
  const magMessagesForStream =
    magGroupThreads.length > 0
      ? await listRecentMagGroupThreadMessagesForStream(
          magGroupThreads.map((t) => t.id),
          {
            limit: magMsgCap,
            dateFrom: rangeIso?.dateFrom ?? null,
            dateTo: rangeIso?.dateTo ?? null,
          }
        )
      : [];

  const authorIds = new Set<string>();
  for (const t of threads) {
    const last = lastByThread.get(t.id);
    if (last?.author_user_id) authorIds.add(last.author_user_id);
  }
  for (const msg of magMessagesForStream) {
    if (msg.author_user_id) authorIds.add(msg.author_user_id);
  }
  for (const row of timelineRows) {
    if (row.author_user_id) authorIds.add(row.author_user_id);
  }
  for (const row of blogRows) {
    if (row.author_user_id) authorIds.add(row.author_user_id);
  }
  for (const row of productRows) {
    if (row.author_user_id) authorIds.add(row.author_user_id);
  }
  const authorNames: Record<string, string> = {};
  await Promise.all(
    [...authorIds].map(async (id) => {
      authorNames[id] = await getCommentAuthorDisplayName(id);
    })
  );

  const contactIds = new Set<string>();
  timelineRows.forEach((r) => {
    if (r.contact_id) contactIds.add(r.contact_id);
  });
  threads.forEach((t) => {
    if (t.subject_type === "contact_support" && t.subject_id) contactIds.add(t.subject_id);
  });

  const taskSubjectIds = threads
    .filter((t) => t.thread_type === "task_ticket" && t.subject_type === "task" && t.subject_id)
    .map((t) => t.subject_id as string);

  /** task_id -> primary CRM contact (row `contact_id`, else first follower contact) */
  const taskContactId = new Map<string, string>();
  if (taskSubjectIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data: taskRows } = await supabase
      .schema(CRM_SCHEMA)
      .from("tasks")
      .select("id, contact_id")
      .in("id", taskSubjectIds);
    for (const row of (taskRows ?? []) as { id: string; contact_id: string | null }[]) {
      if (typeof row.contact_id === "string" && row.contact_id.trim()) {
        taskContactId.set(row.id, row.contact_id.trim());
      }
    }
    const missingFollower = taskSubjectIds.filter((tid) => !taskContactId.has(tid));
    await Promise.all(
      missingFollower.map(async (taskId) => {
        const { data } = await supabase
          .schema(CRM_SCHEMA)
          .from("task_followers")
          .select("contact_id")
          .eq("task_id", taskId)
          .not("contact_id", "is", null)
          .limit(1)
          .maybeSingle();
        const cid = data && typeof (data as { contact_id?: string }).contact_id === "string"
          ? (data as { contact_id: string }).contact_id
          : null;
        if (cid) taskContactId.set(taskId, cid);
      })
    );
  }

  for (const cid of taskContactId.values()) {
    contactIds.add(cid);
  }
  for (const msg of magMessagesForStream) {
    const c = msg.author_contact_id?.trim();
    if (c) contactIds.add(c);
  }

  let contactNames: Record<string, string> = {};
  if (contactIds.size > 0) {
    const supabase = createServerSupabaseClient();
    const { data: contactRows } = await supabase
      .schema(CRM_SCHEMA)
      .from("crm_contacts")
      .select("id, full_name, first_name, last_name, email")
      .in("id", [...contactIds]);
    const rows =
      (contactRows as {
        id: string;
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }[] | null) ?? [];
    for (const r of rows) {
      const name =
        r.full_name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "Contact";
      contactNames[r.id] = name;
    }
  }

  const supportOutUserIds = new Set<string>();
  for (const t of threads) {
    if (t.thread_type === "mag_group" || t.thread_type !== "support") continue;
    const last = lastByThread.get(t.id);
    if (!last) continue;
    const lastCid = last.author_contact_id?.trim() ?? "";
    const lastUid = last.author_user_id?.trim() ?? "";
    if (!lastCid && lastUid) supportOutUserIds.add(lastUid);
  }
  const supportOutRealNames: Record<string, string> = {};
  await Promise.all(
    [...supportOutUserIds].map(async (uid) => {
      supportOutRealNames[uid] = await getRealNameLabelForUser(uid);
    })
  );

  const items: MessageCenterStreamItem[] = [];

  for (const t of threads) {
    if (t.thread_type === "mag_group") continue;
    const last = lastByThread.get(t.id);
    const threadAt = last?.created_at ?? t.updated_at;
    if (rangeIso && !messageCenterItemInDateRange(threadAt, rangeIso)) continue;

    const preview = last?.body?.trim() || "(no messages yet)";
    let contactId = "";
    let taskId: string | null = null;
    if (t.thread_type === "task_ticket" && t.subject_type === "task" && t.subject_id) {
      taskId = t.subject_id;
      contactId = taskContactId.get(t.subject_id) ?? "";
    } else if (t.thread_type === "support" && t.subject_type === "contact_support") {
      const sid = t.subject_id?.trim() ?? "";
      const lastAuthorCid = last?.author_contact_id?.trim() ?? "";
      if (scopedContactId) {
        if (
          supportThreadIdsForScope.has(t.id) ||
          sid === scopedContactId ||
          lastAuthorCid === scopedContactId
        ) {
          contactId = scopedContactId;
        } else {
          contactId = sid;
        }
      } else {
        contactId = sid || lastAuthorCid || "";
      }
    } else {
      contactId = "";
    }
    const contactName =
      contactId && contactNames[contactId] ? contactNames[contactId] : contactId ? "Contact" : "—";

    let authorLabel: string | null = null;
    let supportRollupDirection: "in" | "out" | undefined;
    if (t.thread_type === "support" && last) {
      const lastCid = last.author_contact_id?.trim() ?? "";
      const lastUid = last.author_user_id?.trim() ?? "";
      if (lastCid) {
        supportRollupDirection = "in";
        const fromAuthor = contactNames[lastCid]?.trim();
        authorLabel =
          (fromAuthor && fromAuthor.length > 0 ? fromAuthor : null) ??
          (contactId && contactNames[contactId]?.trim() ? contactNames[contactId].trim() : null) ??
          (contactName !== "—" ? contactName : null);
      } else if (lastUid) {
        supportRollupDirection = "out";
        const real = supportOutRealNames[lastUid]?.trim();
        authorLabel = real && real.length > 0 ? real : null;
      }
    } else {
      authorLabel = last?.author_user_id
        ? authorNames[last.author_user_id] ?? null
        : last?.author_contact_id
          ? contactNames[last.author_contact_id] ?? "Member"
          : null;
    }

    const threadItem: MessageCenterStreamItem = {
      source: "thread",
      id: `thread-${t.id}`,
      at: threadAt,
      threadType: t.thread_type,
      threadId: t.id,
      magId: t.mag_id,
      subjectType: t.subject_type,
      subjectId: t.subject_id,
      preview,
      taskId,
      contactId,
      contactName,
      authorLabel,
      ...(supportRollupDirection ? { supportRollupDirection } : {}),
    };
    if (passesFilter(threadItem, filter)) items.push(threadItem);
  }

  /** MAG group rooms: one stream row per message (not one rollup row per thread). */
  if (magGroupThreads.length > 0 && magMessagesForStream.length > 0) {
    const magThreadById = new Map(magGroupThreads.map((t) => [t.id, t]));
    const magIdsForLabels = [
      ...new Set(
        magGroupThreads
          .map((t) => t.mag_id)
          .filter((id): id is string => typeof id === "string" && !!id.trim())
      ),
    ];
    const magRoomNames: Record<string, string> = {};
    if (magIdsForLabels.length > 0) {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase
        .schema(CRM_SCHEMA)
        .from("mags")
        .select("id, name")
        .in("id", magIdsForLabels);
      for (const m of (data as { id: string; name: string | null }[] | null) ?? []) {
        magRoomNames[m.id] = m.name?.trim() || "MAG";
      }
    }
    for (const msg of magMessagesForStream) {
      const t = magThreadById.get(msg.thread_id);
      if (!t) continue;
      const threadAt = msg.created_at;
      if (rangeIso && !messageCenterItemInDateRange(threadAt, rangeIso)) continue;
      const preview = msg.body?.trim() || "(empty message)";
      const authorLabel = msg.author_user_id
        ? authorNames[msg.author_user_id] ?? null
        : msg.author_contact_id
          ? contactNames[msg.author_contact_id] ?? "Member"
          : null;
      const magId = t.mag_id?.trim() ?? null;
      const contactName = magId ? magRoomNames[magId] ?? "MAG room" : "MAG room";
      const meta =
        msg.metadata && typeof msg.metadata === "object" && !Array.isArray(msg.metadata)
          ? (msg.metadata as Record<string, unknown>)
          : {};
      const isAnnouncement = meta.source === "admin_broadcast";
      const threadItem: MessageCenterStreamItem = {
        source: "thread",
        id: `thread-msg-${msg.id}`,
        at: threadAt,
        threadType: "mag_group",
        threadId: t.id,
        magId,
        subjectType: t.subject_type,
        subjectId: t.subject_id,
        preview,
        taskId: null,
        contactId: "",
        contactName,
        authorLabel,
        ...(isAnnouncement ? { broadcast: true } : {}),
      };
      if (passesFilter(threadItem, filter)) items.push(threadItem);
    }
  }

  /** Contacts with a support thread row in this stream — skip duplicate `message` timeline rows (same GPUM as `thread_messages`). */
  const contactIdsWithSupportThreadInStream = new Set<string>();
  for (const it of items) {
    if (it.source === "thread" && it.threadType === "support") {
      const c = it.contactId?.trim();
      if (c) contactIdsWithSupportThreadInStream.add(c);
    }
  }

  for (const row of blogRows) {
    const kindNorm = "blog_comment";
    const displayKind = normalizeTimelineKindForMessageCenter(kindNorm);
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: row.id,
      at: row.created_at,
      timelineKind: kindNorm,
      displayKind,
      nativeDbTimeline: false,
      contactId: "",
      contactName: row.author_user_id ? authorNames[row.author_user_id] ?? "Commenter" : "Commenter",
      body: row.body?.trim() ? row.body : "Comment",
      contentId: row.content_id,
      status: moderationStatusFromCommentMetadata(row.metadata),
    };
    if (passesFilter(item, filter)) items.push(item);
  }
  for (const row of productRows) {
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: row.id,
      at: row.created_at,
      timelineKind: "product_comment",
      displayKind: "product_comment",
      nativeDbTimeline: false,
      contactId: "",
      contactName: row.author_user_id ? authorNames[row.author_user_id] ?? "Commenter" : "Commenter",
      body: row.body?.trim() ? row.body : "Product comment",
      status: moderationStatusFromCommentMetadata(row.metadata),
    };
    if (passesFilter(item, filter)) items.push(item);
  }

  const magAssignments: { contact_id: string; mag_id: string; assigned_at: string }[] = [];
  const listAdditions: { contact_id: string; list_id: string; added_at: string }[] = [];
  const contactAdds: { id: string; created_at: string }[] = [];
  const ordersRows: {
    id: string;
    customer_email: string;
    contact_id: string | null;
    status: string;
    created_at: string;
  }[] = [];

  const loadSyntheticCrm =
    filter !== "conversations" &&
    (filter === "all" ||
      filter === "notifications" ||
      filter === "contact_added" ||
      filter === "mag_assignment" ||
      filter === "marketing_list" ||
      filter === "order");

  if (loadSyntheticCrm) {
    const supabase = createServerSupabaseClient();
    const synLimit = rangeIso ? 200 : 25;

    let mQ = supabase
      .schema(CRM_SCHEMA)
      .from("crm_contact_mags")
      .select("contact_id, mag_id, assigned_at");
    if (rangeIso?.dateFrom) mQ = mQ.gte("assigned_at", rangeIso.dateFrom);
    if (rangeIso?.dateTo) mQ = mQ.lte("assigned_at", rangeIso.dateTo);
    const mPromise = mQ.order("assigned_at", { ascending: false }).limit(synLimit);

    let lQ = supabase
      .schema(CRM_SCHEMA)
      .from("crm_contact_marketing_lists")
      .select("contact_id, list_id, added_at");
    if (rangeIso?.dateFrom) lQ = lQ.gte("added_at", rangeIso.dateFrom);
    if (rangeIso?.dateTo) lQ = lQ.lte("added_at", rangeIso.dateTo);
    const lPromise = lQ.order("added_at", { ascending: false }).limit(synLimit);

    let cQ = supabase
      .schema(CRM_SCHEMA)
      .from("crm_contacts")
      .select("id, created_at")
      .is("deleted_at", null);
    if (rangeIso?.dateFrom) cQ = cQ.gte("created_at", rangeIso.dateFrom);
    if (rangeIso?.dateTo) cQ = cQ.lte("created_at", rangeIso.dateTo);
    const cPromise = cQ.order("created_at", { ascending: false }).limit(synLimit);

    let oQ = supabase
      .schema(CRM_SCHEMA)
      .from("orders")
      .select("id, customer_email, contact_id, status, created_at");
    if (rangeIso?.dateFrom) oQ = oQ.gte("created_at", rangeIso.dateFrom);
    if (rangeIso?.dateTo) oQ = oQ.lte("created_at", rangeIso.dateTo);
    const oPromise = oQ.order("created_at", { ascending: false }).limit(synLimit);

    const [mData, lData, cData, oData] = await Promise.all([mPromise, lPromise, cPromise, oPromise]);
    magAssignments.push(...((mData.data as typeof magAssignments | null) ?? []));
    listAdditions.push(...((lData.data as typeof listAdditions | null) ?? []));
    contactAdds.push(...((cData.data as typeof contactAdds | null) ?? []));
    if (!oData.error) ordersRows.push(...((oData.data as typeof ordersRows | null) ?? []));
  }

  const extraContactIds = new Set<string>();
  magAssignments.forEach((m) => extraContactIds.add(m.contact_id));
  listAdditions.forEach((l) => extraContactIds.add(l.contact_id));
  contactAdds.forEach((c) => extraContactIds.add(c.id));
  ordersRows.forEach((o) => { if (o.contact_id) extraContactIds.add(o.contact_id); });

  if (extraContactIds.size > 0) {
    const supabase = createServerSupabaseClient();
    const { data: cr } = await supabase
      .schema(CRM_SCHEMA)
      .from("crm_contacts")
      .select("id, full_name, first_name, last_name, email")
      .in("id", [...extraContactIds]);
    const rows =
      (cr as {
        id: string;
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }[] | null) ?? [];
    for (const r of rows) {
      const name =
        r.full_name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "Contact";
      contactNames[r.id] = name;
    }
  }

  const magIds = [...new Set(magAssignments.map((m) => m.mag_id))];
  const listIds = [...new Set(listAdditions.map((l) => l.list_id))];
  const magNames: Record<string, string> = {};
  const listNames: Record<string, string> = {};
  if (magIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.schema(CRM_SCHEMA).from("mags").select("id, name").in("id", magIds);
    ((data as { id: string; name: string | null }[] | null) ?? []).forEach((m) => {
      magNames[m.id] = m.name ?? "MAG";
    });
  }
  if (listIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.schema(CRM_SCHEMA).from("marketing_lists").select("id, name").in("id", listIds);
    ((data as { id: string; name: string | null }[] | null) ?? []).forEach((l) => {
      listNames[l.id] = l.name ?? "List";
    });
  }

  for (const t of timelineRows) {
    const cid = t.contact_id ?? "";
    const kindLower = (t.kind ?? "").trim().toLowerCase();
    const isGlobalNote =
      (kindLower === "staff_note" || kindLower === "note") && !cid.trim();
    if (isGlobalNote) {
      if (!viewerUserId) continue;
      const authorId = t.author_user_id?.trim() ?? "";
      const recipientId = t.recipient_user_id?.trim() ?? "";
      if (authorId !== viewerUserId && recipientId !== viewerUserId) {
        continue;
      }
    }
    if (
      kindLower === "message" &&
      cid.trim() &&
      contactIdsWithSupportThreadInStream.has(cid.trim())
    ) {
      continue;
    }
    const line = (t.body?.trim() || t.title?.trim() || t.kind) ?? "Notification";
    const displayKind = normalizeTimelineKindForMessageCenter(t.kind);
    const meta = parseTimelineMetadataJson(t.metadata);
    const formIdMeta = typeof meta.form_id === "string" ? meta.form_id : null;
    const formNameMeta = typeof meta.form_name === "string" ? meta.form_name : undefined;
    const submissionMeta = typeof meta.submission_id === "string" ? meta.submission_id : null;
    const isFormTimeline =
      t.subject_type === "form_submission" || displayKind === "form_submitted";
    const submissionId =
      submissionMeta ?? (isFormTimeline && t.subject_id?.trim() ? t.subject_id.trim() : null);
    const formId = formIdMeta;
    const noteScope: "note_to_self" | null = timelineRowIsNoteToSelfForViewer(t, viewerUserId)
      ? "note_to_self"
      : null;
    const teamBroadcast = meta.team_broadcast === true;
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: t.id,
      at: t.created_at,
      timelineKind: t.kind,
      displayKind,
      nativeDbTimeline: true,
      contactId: cid,
      contactName:
        cid
          ? (contactNames[cid] ?? "Contact")
          : (kindLower === "staff_note" || kindLower === "note")
            ? "Team"
            : "Contact",
      body: line,
      formName: formNameMeta,
      formId: formId ?? undefined,
      submissionId: submissionId ?? undefined,
      noteScope,
      ...(teamBroadcast ? { teamBroadcast: true } : {}),
    };
    if (!passesFilter(item, filter)) continue;
    items.push(item);
  }

  for (const c of contactAdds) {
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: `contact-${c.id}`,
      at: c.created_at,
      timelineKind: "contact_added",
      displayKind: "contact_added",
      nativeDbTimeline: false,
      contactId: c.id,
      contactName: contactNames[c.id] ?? "Contact",
      body: "Contact added",
    };
    if (passesFilter(item, filter)) items.push(item);
  }

  for (const m of magAssignments) {
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: `mag-${m.contact_id}-${m.mag_id}-${m.assigned_at}`,
      at: m.assigned_at,
      timelineKind: "mag_assignment",
      displayKind: "mag_assignment",
      nativeDbTimeline: false,
      contactId: m.contact_id,
      contactName: contactNames[m.contact_id] ?? "Contact",
      body: `Added to ${magNames[m.mag_id] ?? "MAG"}`,
      magName: magNames[m.mag_id] ?? "MAG",
    };
    if (passesFilter(item, filter)) items.push(item);
  }

  for (const l of listAdditions) {
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: `list-${l.contact_id}-${l.list_id}-${l.added_at}`,
      at: l.added_at,
      timelineKind: "marketing_list",
      displayKind: "marketing_list",
      nativeDbTimeline: false,
      contactId: l.contact_id,
      contactName: contactNames[l.contact_id] ?? "Contact",
      body: `Added to list ${listNames[l.list_id] ?? "List"}`,
      listName: listNames[l.list_id] ?? "List",
    };
    if (passesFilter(item, filter)) items.push(item);
  }

  for (const o of ordersRows) {
    const contactName = o.contact_id
      ? (contactNames[o.contact_id] ?? "Contact")
      : o.customer_email || "Guest";
    const body =
      o.status === "pending"
        ? "Abandoned checkout / Payment incomplete"
        : `Order #${o.id.slice(0, 8)}… — ${o.status}`;
    const item: MessageCenterStreamItem = {
      source: "timeline",
      id: `order-${o.id}`,
      at: o.created_at,
      timelineKind: "order",
      displayKind: "order",
      nativeDbTimeline: false,
      contactId: o.contact_id ?? "",
      contactName,
      body,
      orderId: o.id,
      orderStatus: o.status,
    };
    if (passesFilter(item, filter)) items.push(item);
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  let out = items;
  const scopedContact = options?.contactId?.trim();
  if (scopedContact) {
    out = items.filter((i) => messageCenterItemInvolvesContact(i, scopedContact));
    /**
     * Contact card / scoped MC: keep every conversation thread row, then fill remaining budget
     * with other activity. A flat `slice(limit)` was dropping support threads when the contact
     * had many list/MAG/order/timeline rows above the cap (e.g. limit=55).
     */
    const threadsOnly = out.filter((i) => i.source === "thread");
    const nonThreads = out.filter((i) => i.source !== "thread");
    const budget = Math.max(limit, 120);
    const roomForRest = Math.max(0, budget - threadsOnly.length);
    /**
     * Always retain every contact-scoped staff/note timeline row; otherwise a flat
     * `nonThreads.slice(0, roomForRest)` drops internal notes when many orders / MAG / list
     * rows are newer or higher volume (filter "all" looked broken vs filter "notes").
     */
    const isContactTimelineNote = (i: MessageCenterStreamItem) =>
      i.source === "timeline" && streamTimelineKindIsStaffNoteOrNote(i.timelineKind);
    const contactTimelineNotes = nonThreads.filter(isContactTimelineNote);
    const otherNonThreads = nonThreads.filter((i) => !isContactTimelineNote(i));
    const roomForOther = Math.max(0, roomForRest - contactTimelineNotes.length);
    const tail = [...contactTimelineNotes, ...otherNonThreads.slice(0, roomForOther)].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
    out = [...threadsOnly, ...tail];
  } else {
    out = out.slice(0, limit);
  }

  out = await enrichSupportThreadSearchText(out);

  const forUser = options?.forUserId?.trim();
  if (forUser) {
    const threadIds = out.filter((i) => i.source === "thread").map((i) => i.threadId);
    const unreadMap = await getThreadUnreadMapForUser(forUser, threadIds);
    out = out.map((i) => {
      if (i.source !== "thread") return i;
      const unread = unreadMap.get(i.threadId) ?? false;
      return { ...i, unread };
    });
  }

  return out;
}
