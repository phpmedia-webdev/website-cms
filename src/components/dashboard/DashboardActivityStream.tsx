"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CircleDollarSign,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  PencilLine,
  RotateCcw,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { MessageCenterStreamItem } from "@/lib/message-center/admin-stream";
import {
  normalizeTimelineKindForMessageCenter,
} from "@/lib/message-center/admin-stream";
import { MESSAGE_CENTER_ADMIN_FILTER_OPTIONS } from "@/lib/message-center/admin-filters";
import type { MessageCenterStreamFilter } from "@/lib/message-center/admin-stream";
import { normalizeMessageCenterDateRange } from "@/lib/message-center/date-range";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MessageCenterDatePreset = "initial" | "7d" | "30d" | "90d" | "365d" | "custom";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive calendar-day window in UTC (`date_to` is today). */
function messageCenterPresetYmdRange(daysInclusive: number): { date_from: string; date_to: string } {
  const now = new Date();
  const toY = utcYmd(now);
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  from.setUTCDate(from.getUTCDate() - (daysInclusive - 1));
  return { date_from: utcYmd(from), date_to: toY };
}

const DATE_PRESET_OPTIONS: { value: MessageCenterDatePreset; label: string; days?: number }[] = [
  { value: "initial", label: "Recent (default)" },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last 12 months", days: 365 },
  { value: "custom", label: "Custom range…" },
];

/** Filters where URL `thread_id` / inline transcript apply. For `all`, notes, orders, etc., show the full stream. */
const MESSAGE_CENTER_INLINE_THREAD_FILTERS = new Set<MessageCenterStreamFilter>([
  "conversations",
  "support",
  "direct",
  "group",
  "mag_group",
]);

interface DashboardActivityStreamProps {
  initialItems: MessageCenterStreamItem[];
  /** When set, stream is filtered to this CRM contact (mini Message Center). */
  contactId?: string | null;
  /** Optional initial filter (used by contact drill-in links). */
  initialFilter?: MessageCenterStreamFilter;
  /** Optional support thread to open inline (contact message center). */
  initialThreadId?: string | null;
  /**
   * Contact record Message Center tab: with `thread_id` + a conversation-capable filter (e.g. Messages),
   * show per-message transcript for that thread. Otherwise show the stream list (no auto single-thread rollup).
   */
  contactRecordTab?: boolean;
  /** CRM / GPUM display name for this contact — used in expanded thread subtext (Member · name · time). */
  expandedThreadContactLabel?: string | null;
  /** Tighter layout on contact record. */
  compact?: boolean;
  /** Taller scroll area for `/admin/dashboard/message-center`. */
  layout?: "card" | "full";
}

interface ThreadMessageRow {
  id: string;
  thread_id: string;
  body: string;
  author_user_id: string | null;
  author_contact_id: string | null;
  metadata: Record<string, unknown>;
  parent_message_id: string | null;
  created_at: string;
  edited_at: string | null;
}

const ANNOUNCEMENT_LABEL = "ANNOUNCEMENT";

function messageCenterItemIsAnnouncement(item: MessageCenterStreamItem): boolean {
  if (item.source === "thread") {
    return item.threadType === "mag_group" && item.broadcast === true;
  }
  return item.source === "timeline" && item.teamBroadcast === true;
}

function announcementBodyText(item: MessageCenterStreamItem): string {
  if (item.source === "thread") return item.preview?.trim() || "(empty message)";
  if (item.source === "timeline") return item.body?.trim() || "(empty announcement)";
  return "";
}

function threadTypeLabel(item: MessageCenterStreamItem & { source: "thread" }): string {
  if (item.threadType === "task_ticket") return "COMMENT:TASK";
  if (item.threadType === "support") {
    if (item.supportRollupDirection === "in") return "MESSAGE:IN";
    if (item.supportRollupDirection === "out") return "MESSAGE:OUT";
    return "MESSAGE";
  }
  if (item.threadType === "direct") return "MESSAGE";
  if (item.threadType === "blog_comment") return "COMMENT:BLOG";
  if (item.threadType === "product_comment") return "COMMENT:PRODUCT";
  if (item.threadType === "mag_group" && item.broadcast) return ANNOUNCEMENT_LABEL;
  if (item.threadType === "mag_group") return "MESSAGE";
  if (item.threadType === "group") return "MESSAGE";
  return String(item.threadType).replace(/_/g, " ");
}

/** Primary line in the list: when search hits older thread text, show that line—not only latest `preview`. */
function formatListPrimaryLine(item: MessageCenterStreamItem, searchRaw: string): string {
  const q = searchRaw.trim().toLowerCase();
  if (item.source === "thread" && q.length > 0) {
    const previewLower = item.preview.toLowerCase();
    if (!previewLower.includes(q)) {
      const blob =
        "threadSearchText" in item && typeof item.threadSearchText === "string"
          ? item.threadSearchText
          : "";
      if (blob.toLowerCase().includes(q)) {
        const line =
          blob
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.length > 0 && l.toLowerCase().includes(q)) ?? blob.trim();
        const max = 160;
        const trimmed = line.length > max ? `${line.slice(0, max)}…` : line;
        return `${threadTypeLabel(item)}: ${trimmed}`;
      }
    }
  }
  return formatItem(item);
}

function formatItem(item: MessageCenterStreamItem): string {
  if (item.source === "thread") {
    return `${threadTypeLabel(item)}: ${item.preview}`;
  }
  if (item.source === "timeline" && item.teamBroadcast) {
    return `${ANNOUNCEMENT_LABEL}: ${item.body?.trim() ? item.body : "Announcement"}`;
  }
  if (item.source === "timeline" && item.timelineKind === "blog_comment") {
    return `COMMENT:BLOG: ${item.body?.trim() ? item.body : "Comment"}`;
  }
  if (item.source === "timeline" && item.timelineKind === "product_comment") {
    return `COMMENT:PRODUCT: ${item.body?.trim() ? item.body : "Comment"}`;
  }
  if (item.source === "timeline" && item.timelineKind === "order") {
    return `TRANSACTION: ${item.body?.trim() ? item.body : "Order update"}`;
  }
  if (
    item.source === "timeline" &&
    (item.timelineKind === "staff_note" || item.timelineKind === "note")
  ) {
    const prefix = item.noteScope === "note_to_self" ? "NOTE:SELF" : "NOTE";
    return `${prefix}: ${item.body?.trim() ? item.body : "Note"}`;
  }
  if (
    item.source === "timeline" &&
    normalizeTimelineKindForMessageCenter(item.timelineKind) === "form_submitted"
  ) {
    const formLabel = item.formName?.trim() || "Form";
    const firstLine =
      item.body
        ?.split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0) ?? "";
    return firstLine
      ? `NOTIFICATION: ${formLabel} · ${firstLine}`
      : `NOTIFICATION: Form submission · ${formLabel}`;
  }
  return `NOTIFICATION: ${item.body?.trim() ? item.body : "Notification"}`;
}

function resolveHref(item: MessageCenterStreamItem): string {
  if (item.source === "thread") {
    if (item.threadType === "task_ticket" && item.taskId) {
      return `/admin/projects/tasks/${item.taskId}`;
    }
    if (item.threadType === "support" && item.contactId) {
      const q = new URLSearchParams();
      q.set("mc_filter", "conversations");
      q.set("thread_id", item.threadId);
      return `/admin/crm/contacts/${item.contactId}?${q.toString()}`;
    }
    if (item.threadType === "mag_group" && item.magId) {
      return `/admin/crm/memberships/${item.magId}`;
    }
    if (item.contactId) return `/admin/crm/contacts/${item.contactId}`;
    return "#";
  }
  if (item.source === "timeline") {
    if (
      normalizeTimelineKindForMessageCenter(item.timelineKind) === "form_submitted" &&
      item.formId
    ) {
      const q = new URLSearchParams();
      q.set("formId", item.formId);
      q.set("preset", "all");
      if (item.submissionId) q.set("submissionId", item.submissionId);
      return `/admin/crm/forms/submissions?${q.toString()}`;
    }
  }
  if (item.orderId) return `/admin/ecommerce/orders/${item.orderId}`;
  if (item.contentId) return `/admin/content/${item.contentId}/edit`;
  if (item.contactId) return `/admin/crm/contacts/${item.contactId}`;
  return "#";
}

function kindBadge(item: MessageCenterStreamItem): string | null {
  if (messageCenterItemIsAnnouncement(item)) return ANNOUNCEMENT_LABEL;
  if (item.source === "thread") {
    return threadTypeLabel(item);
  }
  const kind = item.displayKind ?? item.timelineKind ?? "";
  if (kind === "blog_comment") return "COMMENT:BLOG";
  if (kind === "product_comment") return "COMMENT:PRODUCT";
  if (kind === "order") return "TRANSACTION";
  if (item.source === "timeline" && item.noteScope === "note_to_self") return "NOTE:SELF";
  if (kind === "staff_note" || kind === "note") return "NOTE";
  return "NOTIFICATION";
}

type RowVisual = {
  Icon: LucideIcon;
  iconWrapClass: string;
  iconClass: string;
  badgeClass: string;
};

function rowVisual(item: MessageCenterStreamItem): RowVisual {
  if (messageCenterItemIsAnnouncement(item)) {
    return {
      Icon: Megaphone,
      iconWrapClass: "bg-rose-500/15 border border-rose-500/30",
      iconClass: "text-rose-700 dark:text-rose-300",
      badgeClass: "bg-rose-500/15 text-rose-900 dark:text-rose-100",
    };
  }
  const isMessageThread =
    item.source === "thread" &&
    (item.threadType === "support" ||
      item.threadType === "direct" ||
      item.threadType === "group" ||
      item.threadType === "mag_group");
  const isComment =
    (item.source === "thread" && item.threadType === "task_ticket") ||
    (item.source === "timeline" &&
      (item.timelineKind === "blog_comment" || item.timelineKind === "product_comment"));
  const isTransaction = item.source === "timeline" && item.timelineKind === "order";
  const isNote =
    item.source === "timeline" &&
    (item.timelineKind === "staff_note" || item.timelineKind === "note");

  if (isMessageThread) {
    return {
      Icon: MessagesSquare,
      iconWrapClass: "bg-blue-500/15 border border-blue-500/30",
      iconClass: "text-blue-700 dark:text-blue-300",
      badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
    };
  }
  if (isComment) {
    return {
      Icon: MessageSquareText,
      iconWrapClass: "bg-violet-500/15 border border-violet-500/30",
      iconClass: "text-violet-700 dark:text-violet-300",
      badgeClass: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
    };
  }
  if (isTransaction) {
    return {
      Icon: CircleDollarSign,
      iconWrapClass: "bg-emerald-500/15 border border-emerald-500/30",
      iconClass: "text-emerald-700 dark:text-emerald-300",
      badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    };
  }
  if (isNote) {
    return {
      Icon: PencilLine,
      iconWrapClass: "bg-cyan-500/15 border border-cyan-500/30",
      iconClass: "text-cyan-700 dark:text-cyan-300",
      badgeClass: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200",
    };
  }
  return {
    Icon: Bell,
    iconWrapClass: "bg-amber-500/15 border border-amber-500/30",
    iconClass: "text-amber-700 dark:text-amber-300",
    badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  };
}

export function DashboardActivityStream({
  initialItems,
  contactId = null,
  initialFilter = "all",
  initialThreadId = null,
  contactRecordTab = false,
  expandedThreadContactLabel = null,
  compact = false,
  layout = "card",
}: DashboardActivityStreamProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<MessageCenterStreamFilter>(initialFilter);
  const [items, setItems] = useState<MessageCenterStreamItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [canApproveReject, setCanApproveReject] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [composerType, setComposerType] = useState<"message" | "private">("message");
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() =>
    initialThreadId?.trim() ? initialThreadId.trim() : null
  );
  /** Contact tab: last known URL `thread_id` so we clear transcript when SPA drops it, but not when filter changes with no URL thread. */
  const prevUrlThreadIdRef = useRef<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessageRow[]>([]);
  const [threadAuthors, setThreadAuthors] = useState<
    Record<string, { roleLabel: string; displayName: string }>
  >({});
  const [threadMsgContactNames, setThreadMsgContactNames] = useState<Record<string, string>>({});
  const [threadRefreshNonce, setThreadRefreshNonce] = useState(0);
  const [composerMessageOnly, setComposerMessageOnly] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const [datePreset, setDatePreset] = useState<MessageCenterDatePreset>("initial");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  const [viewingSelfNote, setViewingSelfNote] = useState<MessageCenterStreamItem | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<MessageCenterStreamItem | null>(null);
  const [selfNoteDeleteIntent, setSelfNoteDeleteIntent] = useState(false);
  const [selfNoteDeleting, setSelfNoteDeleting] = useState(false);
  const [selfNoteError, setSelfNoteError] = useState<string | null>(null);
  /** Committed custom range (fetch uses this when preset is custom). */
  const [customRangeApplied, setCustomRangeApplied] = useState<{
    date_from: string;
    date_to: string;
  } | null>(null);
  const forcedContactThreadId = useMemo(() => {
    if (contactRecordTab) return null;
    const cid = contactId?.trim();
    if (!cid) return null;
    if (!MESSAGE_CENTER_INLINE_THREAD_FILTERS.has(typeFilter)) return null;
    const messageThreads = items.filter(
      (i): i is MessageCenterStreamItem & { source: "thread" } =>
        i.source === "thread" &&
        (i.threadType === "support" ||
          i.threadType === "direct" ||
          i.threadType === "group" ||
          i.threadType === "mag_group")
    );
    if (messageThreads.length !== 1) return null;
    return messageThreads[0].threadId;
  }, [contactRecordTab, contactId, items, typeFilter]);
  const resolvedActiveThreadId = contactRecordTab
    ? activeThreadId
    : (forcedContactThreadId ?? activeThreadId);

  const dateQueryKey = useMemo(() => {
    if (datePreset === "initial") return "";
    if (datePreset === "custom") {
      if (!customRangeApplied) return "";
      const { date_from, date_to } = customRangeApplied;
      if (!date_from.trim() && !date_to.trim()) return "";
      const norm = normalizeMessageCenterDateRange(date_from || null, date_to || null);
      if (!norm) return "invalid";
      return `${norm.dateFrom ?? ""}|${norm.dateTo ?? ""}`;
    }
    const opt = DATE_PRESET_OPTIONS.find((o) => o.value === datePreset);
    const days = opt?.days ?? 30;
    const { date_from, date_to } = messageCenterPresetYmdRange(days);
    return `${date_from}|${date_to}`;
  }, [datePreset, customRangeApplied]);

  const hasActiveDateRange = dateQueryKey.length > 0 && dateQueryKey !== "invalid";
  const customDraftInvalid = useMemo(() => {
    if (!customDateFrom.trim() && !customDateTo.trim()) return false;
    return !normalizeMessageCenterDateRange(customDateFrom.trim() || null, customDateTo.trim() || null);
  }, [customDateFrom, customDateTo]);

  const messageCenterQuery = useCallback(
    (filter: MessageCenterStreamFilter, dateKey: string) => {
      const useRange = dateKey.length > 0 && dateKey !== "invalid";
      const [df, dt] = useRange ? dateKey.split("|") : ["", ""];
      const q = new URLSearchParams({
        filter,
        limit: useRange ? "200" : "90",
      });
      const cid = contactId?.trim();
      if (cid) q.set("contact_id", cid);
      if (useRange && df) q.set("date_from", df);
      if (useRange && dt) q.set("date_to", dt);
      return q.toString();
    },
    [contactId]
  );

  useEffect(() => {
    setTypeFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (contactRecordTab) {
      const tid = initialThreadId?.trim() || null;
      const inlineOk = MESSAGE_CENTER_INLINE_THREAD_FILTERS.has(typeFilter);
      if (!inlineOk) {
        setActiveThreadId(null);
        prevUrlThreadIdRef.current = tid;
        return;
      }
      if (tid) {
        setActiveThreadId(tid);
        prevUrlThreadIdRef.current = tid;
        return;
      }
      if (prevUrlThreadIdRef.current && !tid) {
        setActiveThreadId(null);
      }
      prevUrlThreadIdRef.current = tid;
      return;
    }
    if (!MESSAGE_CENTER_INLINE_THREAD_FILTERS.has(typeFilter)) {
      setActiveThreadId(null);
      return;
    }
    const tid = initialThreadId?.trim();
    if (tid) setActiveThreadId(tid);
  }, [contactRecordTab, initialThreadId, typeFilter]);

  useEffect(() => {
    if (!resolvedActiveThreadId) {
      setThreadMessages([]);
      setThreadAuthors({});
      setThreadMsgContactNames({});
      setThreadError(null);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    setThreadError(null);
    const enrichQ = contactId?.trim() ? "&enrichAuthors=1" : "";
    fetch(
      `/api/conversation-threads/${encodeURIComponent(resolvedActiveThreadId)}/messages?limit=200${enrichQ}`,
      {
        cache: "no-store",
      }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch"))))
      .then(
        (d: {
          data?: ThreadMessageRow[];
          authors?: Record<string, { roleLabel: string; displayName: string }>;
          contactNames?: Record<string, string>;
        }) => {
          if (cancelled) return;
          const rows = Array.isArray(d.data) ? d.data : [];
          rows.sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return contactId?.trim() ? ta - tb : tb - ta;
          });
          setThreadMessages(rows);
          if (contactId?.trim() && d.authors && d.contactNames) {
            setThreadAuthors(d.authors);
            setThreadMsgContactNames(d.contactNames);
          } else {
            setThreadAuthors({});
            setThreadMsgContactNames({});
          }
        }
      )
      .catch(() => {
        if (cancelled) return;
        setThreadMessages([]);
        setThreadAuthors({});
        setThreadMsgContactNames({});
        setThreadError("Failed to load thread messages.");
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedActiveThreadId, contactId, threadRefreshNonce]);

  useEffect(() => {
    if (!resolvedActiveThreadId || loadingThread) return;
    const el = threadScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [resolvedActiveThreadId, loadingThread, threadMessages.length, threadRefreshNonce]);

  useEffect(() => {
    /** Contact-scoped stream must refetch: SSR limit/cap can diverge from `/api/admin/message-center` and skip rows that appear under filter "notes". */
    const useInitialOnly =
      typeFilter === "all" && !hasActiveDateRange && !(contactId?.trim().length);
    if (useInitialOnly) {
      setItems(initialItems);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/message-center?${messageCenterQuery(typeFilter, dateQueryKey)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch"))))
      .then((d: { items?: MessageCenterStreamItem[] }) => {
        if (!cancelled && Array.isArray(d.items)) {
          setItems(d.items);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [typeFilter, initialItems, messageCenterQuery, dateQueryKey, hasActiveDateRange, contactId]);

  useEffect(() => {
    fetch("/api/admin/me/context", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx: { canApproveReject?: boolean } | null) => {
        setCanApproveReject(!!ctx?.canApproveReject);
      })
      .catch(() => setCanApproveReject(false));
  }, []);

  const handleCommentStatus = async (
    noteId: string,
    kind: "blog_comment" | "product_comment",
    status: "approved" | "rejected"
  ) => {
    setModeratingId(noteId);
    try {
      const endpoint =
        kind === "product_comment" ? `/api/product/comments/${noteId}` : `/api/blog/comments/${noteId}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setModeratingId(null);
    }
  };

  const closeSelfNoteDialog = useCallback(() => {
    setViewingSelfNote(null);
    setSelfNoteDeleteIntent(false);
    setSelfNoteError(null);
  }, []);

  const handleDeleteSelfNote = async () => {
    if (!viewingSelfNote || viewingSelfNote.source !== "timeline") return;
    setSelfNoteDeleting(true);
    setSelfNoteError(null);
    try {
      const res = await fetch(
        `/api/admin/message-center/notes/${encodeURIComponent(viewingSelfNote.id)}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSelfNoteError(typeof data?.error === "string" ? data.error : "Delete failed");
        return;
      }
      const removedId = viewingSelfNote.id;
      setItems((prev) => prev.filter((i) => !(i.source === "timeline" && i.id === removedId)));
      closeSelfNoteDialog();
      router.refresh();
    } catch {
      setSelfNoteError("Delete failed");
    } finally {
      setSelfNoteDeleting(false);
    }
  };

  const handleCreateGlobalNote = async () => {
    const body = noteBody.trim();
    if (!body) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const scopedContactId = contactId?.trim() ?? "";
      const isContactComposer = scopedContactId.length > 0;
      /** Client-visible messages must use `createNote` → `thread_messages` so GPUM + contact MC show full thread. */
      const res = isContactComposer
        ? await fetch(`/api/crm/contacts/${encodeURIComponent(scopedContactId)}/notes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              composerType === "message"
                ? { body, note_type: "message" }
                : { body, note_type: "staff_note" }
            ),
          })
        : await fetch("/api/admin/message-center/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNoteError(typeof data?.error === "string" ? data.error : "Failed to create note");
        return;
      }
      const bumpThread =
        !!resolvedActiveThreadId &&
        !!contactId?.trim() &&
        isContactComposer &&
        composerType === "message";
      setNoteBody("");
      setComposerType("message");
      setAddNoteOpen(false);
      setComposerMessageOnly(false);
      if (bumpThread) setThreadRefreshNonce((n) => n + 1);
      router.refresh();
    } catch {
      setNoteError("Failed to create note");
    } finally {
      setSavingNote(false);
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => {
        if (i.source === "thread") {
          const threadBlob =
            "threadSearchText" in i && typeof i.threadSearchText === "string"
              ? i.threadSearchText.toLowerCase()
              : "";
          return (
            i.preview.toLowerCase().includes(q) ||
            threadBlob.includes(q) ||
            i.contactName.toLowerCase().includes(q) ||
            (i.authorLabel?.toLowerCase().includes(q) ?? false)
          );
        }
        const displayLine = formatListPrimaryLine(i, "").toLowerCase();
        return (
          displayLine.includes(q) ||
          i.contactName.toLowerCase().includes(q) ||
          (i.body?.toLowerCase().includes(q) ?? false) ||
          (i.formName?.toLowerCase().includes(q) ?? false) ||
          (i.magName?.toLowerCase().includes(q) ?? false) ||
          (i.listName?.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return list;
  }, [items, search]);

  const resetControls = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setDatePreset("initial");
    setCustomDateFrom("");
    setCustomDateTo("");
    setCustomRangeApplied(null);
    setCustomDateDialogOpen(false);
  }, []);

  const isContactInlineConversation = !!(resolvedActiveThreadId && contactId?.trim());
  const useRichTranscriptMeta = !!contactId?.trim();

  const hasAnythingToReset = useMemo(() => {
    if (search.trim()) return true;
    if (typeFilter !== "all") return true;
    if (datePreset !== "initial") return true;
    if (customRangeApplied) return true;
    if (customDateFrom.trim() || customDateTo.trim()) return true;
    if (customDateDialogOpen) return true;
    return false;
  }, [
    search,
    typeFilter,
    datePreset,
    customRangeApplied,
    customDateFrom,
    customDateTo,
    customDateDialogOpen,
  ]);

  return (
    <Card className={cn("w-full", layout === "full" && "max-w-none")}>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <CardTitle className="text-sm font-medium min-w-0">
            {contactId?.trim() ? "Message Center (this contact)" : "Message Center"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {!isContactInlineConversation && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setComposerMessageOnly(false);
                  const scoped = !!contactId?.trim();
                  const messagesFilter = typeFilter === "conversations";
                  setComposerType(scoped && messagesFilter ? "message" : scoped ? "private" : "message");
                  setAddNoteOpen(true);
                  setNoteError(null);
                }}
              >
                {contactId?.trim() && typeFilter === "conversations"
                  ? "Add message or note"
                  : "Add Note"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible whitespace-nowrap px-1 py-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:z-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MessageCenterStreamFilter)}
            className={cn(
              "h-8 rounded-md border border-input bg-background px-2 py-1 text-xs",
              layout === "full" ? "min-w-[11rem] max-w-[min(100%,24rem)]" : "max-w-[200px] shrink-0"
            )}
          >
            {MESSAGE_CENTER_ADMIN_FILTER_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={datePreset}
            onChange={(e) => {
              const v = e.target.value as MessageCenterDatePreset;
              if (v === "custom") {
                setCustomDateDialogOpen(true);
                return;
              }
              setDatePreset(v);
              setCustomRangeApplied(null);
            }}
            className={cn(
              "h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shrink-0",
              layout === "full" ? "min-w-[10rem] max-w-[15rem]" : "max-w-[140px]"
            )}
          >
            {DATE_PRESET_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {value === "custom" && datePreset === "custom" && customRangeApplied ? "Custom (applied)" : label}
              </option>
            ))}
          </select>
          {datePreset === "custom" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => setCustomDateDialogOpen(true)}
            >
              Edit custom
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={resetControls}
            disabled={!hasAnythingToReset}
            aria-label="Reset search, filter, and date range"
            title="Reset search, filter, and date range"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
        <Dialog open={customDateDialogOpen} onOpenChange={setCustomDateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Custom date range</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-8 text-xs"
                aria-label="From date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-8 text-xs"
                aria-label="To date"
              />
            </div>
            {customDraftInvalid && (
              <p className="text-xs text-destructive">Fix dates (from before to, or one side empty).</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCustomDateFrom("");
                  setCustomDateTo("");
                  setCustomRangeApplied(null);
                  setDatePreset("initial");
                  setCustomDateDialogOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  (!customDateFrom.trim() && !customDateTo.trim()) || customDraftInvalid
                }
                onClick={() => {
                  const norm = normalizeMessageCenterDateRange(
                    customDateFrom.trim() || null,
                    customDateTo.trim() || null
                  );
                  if (!norm) return;
                  setCustomRangeApplied({
                    date_from: customDateFrom.trim(),
                    date_to: customDateTo.trim(),
                  });
                  setDatePreset("custom");
                  setCustomDateDialogOpen(false);
                }}
              >
                Apply range
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={viewingAnnouncement != null}
          onOpenChange={(open) => {
            if (!open) setViewingAnnouncement(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Announcement</DialogTitle>
            </DialogHeader>
            {viewingAnnouncement ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {ANNOUNCEMENT_LABEL} · {new Date(viewingAnnouncement.at).toLocaleString()}
                </p>
                {viewingAnnouncement.source === "thread" ? (
                  <p className="text-xs text-muted-foreground">
                    {viewingAnnouncement.contactName}
                    {viewingAnnouncement.authorLabel
                      ? ` · ${viewingAnnouncement.authorLabel}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{viewingAnnouncement.contactName}</p>
                )}
                <div className="max-h-[min(50vh,28rem)] overflow-y-auto rounded-md border bg-muted/30 px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {announcementBodyText(viewingAnnouncement)}
                  </p>
                </div>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-2 sm:justify-end flex-col sm:flex-row">
              {viewingAnnouncement?.source === "thread" &&
              viewingAnnouncement.threadType === "mag_group" &&
              viewingAnnouncement.magId ? (
                <Button type="button" variant="outline" size="sm" className="sm:mr-auto w-full sm:w-auto" asChild>
                  <Link href={`/admin/crm/memberships/${viewingAnnouncement.magId}`}>Open MAG</Link>
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setViewingAnnouncement(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={viewingSelfNote != null}
          onOpenChange={(open) => {
            if (!open) closeSelfNoteDialog();
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Scratch note</DialogTitle>
            </DialogHeader>
            {viewingSelfNote && viewingSelfNote.source === "timeline" ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  NOTE:SELF · {new Date(viewingSelfNote.at).toLocaleString()}
                </p>
                <div className="max-h-[min(50vh,28rem)] overflow-y-auto rounded-md border bg-muted/30 px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {viewingSelfNote.body?.trim() || "(empty note)"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only scratch notes can be removed here. Everything else in Message Center is kept as an audit
                  record.
                </p>
                {selfNoteError ? <p className="text-xs text-destructive">{selfNoteError}</p> : null}
                {selfNoteDeleteIntent ? (
                  <p className="text-sm text-destructive">Delete this note permanently? This cannot be undone.</p>
                ) : null}
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              {selfNoteDeleteIntent ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={selfNoteDeleting}
                    onClick={() => setSelfNoteDeleteIntent(false)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={selfNoteDeleting}
                    onClick={handleDeleteSelfNote}
                  >
                    {selfNoteDeleting ? "Deleting…" : "Delete permanently"}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={closeSelfNoteDialog}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setSelfNoteDeleteIntent(true)}
                  >
                    Delete note
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={addNoteOpen}
          onOpenChange={(open) => {
            setAddNoteOpen(open);
            if (!open) setComposerMessageOnly(false);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {composerMessageOnly
                  ? "Message"
                  : contactId?.trim()
                    ? "Add message or note"
                    : "Add note"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {contactId?.trim() && !composerMessageOnly ? (
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={composerType}
                  onChange={(e) => setComposerType(e.target.value as "message" | "private")}
                >
                  <option value="message">Message to contact (visible to contact)</option>
                  <option value="private">Internal note (staff only)</option>
                </select>
              ) : null}
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder={
                  contactId?.trim()
                    ? composerType === "message"
                      ? "Message the contact can see..."
                      : "Internal note for staff..."
                    : "Scratch note for yourself..."
                }
              />
              {noteError ? <p className="text-xs text-destructive">{noteError}</p> : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddNoteOpen(false);
                  setComposerMessageOnly(false);
                }}
                disabled={savingNote}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateGlobalNote}
                disabled={savingNote || !noteBody.trim()}
              >
                {savingNote
                  ? composerMessageOnly
                    ? "Sending…"
                    : "Saving…"
                  : composerMessageOnly
                    ? "Send message"
                    : "Save note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div
          className={cn(
            isContactInlineConversation && "flex min-h-0 flex-col gap-2",
            !isContactInlineConversation && "contents"
          )}
        >
          <div
            ref={threadScrollRef}
            className={cn(
              "overflow-y-auto space-y-1",
              isContactInlineConversation &&
                cn(
                  "min-h-[200px] flex-1",
                  compact
                    ? "max-h-[260px]"
                    : layout === "full"
                      ? "max-h-[min(72vh,50rem)]"
                      : "max-h-[340px]"
                ),
              !isContactInlineConversation &&
                (compact
                  ? "max-h-[280px]"
                  : layout === "full"
                    ? "max-h-[min(75vh,52rem)] min-h-[320px]"
                    : "max-h-[360px]")
            )}
          >
          {resolvedActiveThreadId ? (
            loadingThread ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading conversation…</p>
            ) : threadError ? (
              <p className="text-xs text-destructive py-4 text-center">{threadError}</p>
            ) : threadMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No messages in this conversation yet.</p>
            ) : (
              <div className="space-y-1">
                {threadMessages.map((m) => {
                  const isMember = !!m.author_contact_id?.trim();
                  const isStaff = !isMember && !!m.author_user_id?.trim();
                  const who = isMember ? "Member" : isStaff ? "Staff" : "System";
                  const dt = new Date(m.created_at).toLocaleString();
                  let subLine: string;
                  if (useRichTranscriptMeta) {
                    const cid = m.author_contact_id?.trim();
                    const uid = m.author_user_id?.trim();
                    if (cid) {
                      const cname =
                        threadMsgContactNames[cid] ??
                        expandedThreadContactLabel?.trim() ??
                        "Contact";
                      subLine = `Member · ${cname} · ${dt}`;
                    } else if (uid) {
                      const meta = threadAuthors[uid];
                      subLine = meta
                        ? `${meta.roleLabel} · ${meta.displayName} · ${dt}`
                        : `Team · ${dt}`;
                    } else {
                      subLine = `System · ${dt}`;
                    }
                  } else {
                    subLine = `MESSAGE · ${who} · ${dt}`;
                  }
                  const iconWrapClass = isMember
                    ? "bg-slate-500/15 border border-slate-500/30"
                    : isStaff
                      ? "bg-blue-500/15 border border-blue-500/30"
                      : "bg-zinc-500/10 border border-zinc-500/25";
                  const iconClass = isMember
                    ? "text-slate-700 dark:text-slate-300"
                    : isStaff
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-600 dark:text-zinc-400";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/50 text-sm",
                        isMember ? "flex-row" : "flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                          iconWrapClass
                        )}
                        aria-hidden
                      >
                        <MessagesSquare className={cn("h-3.5 w-3.5", iconClass)} />
                      </div>
                      <div className={cn("flex-1 min-w-0", isMember ? "text-left" : "text-right")}>
                        <p className="whitespace-pre-wrap break-words">{m.body?.trim() || "(empty message)"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{subLine}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No items match</p>
          ) : (
            filtered.map((item) => {
              const href = resolveHref(item);
              const badge = kindBadge(item);
              const visual = rowVisual(item);
              const primaryLine = formatListPrimaryLine(item, search);
              const showBadge =
                !!badge && !primaryLine.toUpperCase().startsWith(`${badge.toUpperCase()}:`);
              const subLine =
                item.source === "thread"
                  ? item.authorLabel
                    ? `${item.contactName} · ${item.authorLabel}`
                    : item.contactName
                  : item.contactName;
              const isPendingComment =
                item.source === "timeline" &&
                (item.timelineKind === "blog_comment" || item.timelineKind === "product_comment") &&
                item.status === "pending" &&
                item.id;
              const openInlineSupportThread =
                !!contactId?.trim() &&
                item.source === "thread" &&
                item.threadType === "support";
              const openSelfNoteDetail =
                item.source === "timeline" && item.noteScope === "note_to_self";
              const openAnnouncementDetail = messageCenterItemIsAnnouncement(item);
              const rowText = (
                <>
                  <p className="truncate">{primaryLine}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{subLine}</span>
                    <span>·</span>
                    <span>{new Date(item.at).toLocaleString()}</span>
                    {showBadge && (
                      <span
                        className={cn(
                          "inline-flex rounded px-1 py-0.5 text-[10px] font-medium",
                          visual.badgeClass
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </p>
                </>
              );
              return (
                <div
                  key={`${item.source}-${item.id}-${item.at}`}
                  className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group"
                >
                  <div
                    className={cn(
                      "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      visual.iconWrapClass
                    )}
                    aria-hidden
                  >
                    <visual.Icon className={cn("h-3.5 w-3.5", visual.iconClass)} />
                  </div>
                  {openInlineSupportThread ? (
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-sm transition-colors text-left"
                      onClick={() => {
                        setTypeFilter("conversations");
                        if (item.source === "thread") setActiveThreadId(item.threadId);
                      }}
                    >
                      {rowText}
                    </button>
                  ) : openAnnouncementDetail ? (
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-sm text-left transition-colors hover:underline underline-offset-2 cursor-pointer"
                      onClick={() => setViewingAnnouncement(item)}
                    >
                      {rowText}
                    </button>
                  ) : openSelfNoteDetail ? (
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-sm text-left transition-colors hover:underline underline-offset-2 cursor-pointer"
                      onClick={() => {
                        setSelfNoteDeleteIntent(false);
                        setSelfNoteError(null);
                        setViewingSelfNote(item);
                      }}
                    >
                      {rowText}
                    </button>
                  ) : href === "#" ? (
                    <div className="flex-1 min-w-0 text-sm text-foreground">{rowText}</div>
                  ) : (
                    <Link href={href} className="flex-1 min-w-0 text-sm transition-colors">
                      {rowText}
                    </Link>
                  )}
                  {canApproveReject && isPendingComment && item.id && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={moderatingId === item.id}
                        onClick={() =>
                          handleCommentStatus(
                            item.id!,
                            item.timelineKind === "product_comment" ? "product_comment" : "blog_comment",
                            "approved"
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={moderatingId === item.id}
                        onClick={() =>
                          handleCommentStatus(
                            item.id!,
                            item.timelineKind === "product_comment" ? "product_comment" : "blog_comment",
                            "rejected"
                          )
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
          {isContactInlineConversation ? (
            <div className="shrink-0 border-t border-border pt-2 pb-0.5 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-9"
                onClick={() => {
                  setComposerMessageOnly(true);
                  setComposerType("message");
                  setNoteError(null);
                  setAddNoteOpen(true);
                }}
              >
                Message
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
