/**
 * GPUM Message Center — normalized stream types and adapters.
 * See docs/reference/plan-gpum-message-center-mvp.md and docs/sessionlog.md §3.
 * UI consuming this should stay functional/plain; tenant forks apply bespoke design.
 */

import type { DashboardActivityItem } from "@/lib/supabase/crm";

/** v2 API payload (cursor pagination — wire in Phase 1+). */
export type MemberMessageCenterApiResponse = {
  /** Legacy shape; keep until GPUM UI consumes `streamItems` only. */
  items: DashboardActivityItem[];
  streamItems: MemberMessageCenterStreamItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Discriminated union for merged All stream + future conversation heads. */
export type MemberMessageCenterStreamItem =
  | MemberStreamNotificationItem
  | MemberStreamAnnouncementFeedItem
  | MemberStreamConversationHeadItem;

export type MemberStreamNotificationItem = {
  kind: "notification";
  id: string;
  at: string;
  title: string;
  preview: string;
  deepLink?: string;
  /** Original dashboard row type (for filters). */
  sourceType: DashboardActivityItem["type"];
  /** Optional finer tag (e.g. mag_announcement lives in announcement_feed; this is for notes/messages). */
  sourceNoteType?: string | null;
  /** Member deep links when present. */
  orderId?: string;
  formName?: string;
};

export type MemberStreamAnnouncementFeedItem = {
  kind: "announcement_feed";
  id: string;
  at: string;
  title: string;
  preview: string;
  magName: string;
  /** Present when linked to a thread message row. */
  sourceMessageId: string;
  /** MAG id when known (Phase 1). */
  magId?: string;
  threadId?: string;
};

export type MemberStreamConversationHeadItem = {
  kind: "conversation_head";
  id: string;
  at: string;
  title: string;
  preview: string;
  threadId: string;
  threadType: "support" | "mag_group";
  magId?: string | null;
  unread?: boolean;
};

function stableFallbackId(prefix: string, item: DashboardActivityItem): string {
  const tail = `${item.at}-${(item.body ?? "").slice(0, 48)}`;
  return `${prefix}-${hashIdSegment(tail)}`;
}

function hashIdSegment(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function notificationTitle(item: DashboardActivityItem): string {
  switch (item.type) {
    case "message":
      return item.noteType === "mag_announcement" ? (item.magName ?? "Announcement") : "Message";
    case "note":
      return item.contactName || "Notification";
    case "form_submission":
      return item.formName ?? "Form";
    case "order":
      return "Order";
    case "mag_assignment":
      return item.magName ?? "Membership";
    case "marketing_list":
      return item.listName ?? "List";
    case "blog_comment":
      return "Comment";
    case "contact_added":
      return "Welcome";
    default:
      return item.contactName || "Notification";
  }
}

/**
 * Maps legacy `getMemberActivity` rows into v2 stream items.
 * Phase 1 adds `conversation_head` rows from thread rollups.
 */
export function buildMemberStreamItemsFromActivity(
  activity: DashboardActivityItem[]
): MemberMessageCenterStreamItem[] {
  const out: MemberMessageCenterStreamItem[] = [];
  for (const item of activity) {
    if (item.type === "message" && item.noteType === "mag_announcement") {
      const id = item.id ?? stableFallbackId("ann", item);
      out.push({
        kind: "announcement_feed",
        id,
        at: item.at,
        title: item.magName ? `Announcement · ${item.magName}` : "Announcement",
        preview: (item.body ?? "").trim() || "Announcement",
        magName: item.magName ?? "MAG",
        sourceMessageId: id,
        magId: item.magId,
      });
      continue;
    }

    if (item.type === "message" && item.noteType === "tenant_announcement") {
      const id = item.id ?? stableFallbackId("tann", item);
      out.push({
        kind: "announcement_feed",
        id,
        at: item.at,
        title: "Announcement · Everyone",
        preview: (item.body ?? "").trim() || "Announcement",
        magName: "Everyone",
        sourceMessageId: id,
      });
      continue;
    }

    const id = item.id ?? stableFallbackId(item.type, item);
    out.push({
      kind: "notification",
      id,
      at: item.at,
      title: notificationTitle(item),
      preview: (item.body ?? "").trim() || notificationTitle(item),
      sourceType: item.type,
      sourceNoteType: item.noteType ?? null,
      orderId: item.orderId,
      formName: item.formName,
    });
  }
  return out;
}

export type MemberMessageCenterFilter = "all" | "conversations" | "notifications";

/** GPUM message center primary filter control (server `filter` query). */
export const MEMBER_MESSAGE_CENTER_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "conversations", label: "Conversations" },
  { value: "notifications", label: "Notifications" },
] as const;

function isConversationLikeNotification(i: MemberMessageCenterStreamItem): boolean {
  return (
    i.kind === "conversation_head" ||
    (i.kind === "notification" && i.sourceType === "message" && i.sourceNoteType === "message")
  );
}

export function filterMemberStreamItems(
  items: MemberMessageCenterStreamItem[],
  filter: MemberMessageCenterFilter
): MemberMessageCenterStreamItem[] {
  if (filter === "all") return items;
  if (filter === "conversations") {
    return items.filter(isConversationLikeNotification);
  }
  /* Notifications: everything that is not a conversation drill target */
  return items.filter((i) => !isConversationLikeNotification(i));
}
