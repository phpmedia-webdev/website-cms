"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Search } from "lucide-react";
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

interface DashboardActivityStreamProps {
  initialItems: MessageCenterStreamItem[];
  /** When set, stream is filtered to this CRM contact (mini Message Center). */
  contactId?: string | null;
  /** Tighter layout on contact record. */
  compact?: boolean;
  /** Taller scroll area for `/admin/dashboard/message-center`. */
  layout?: "card" | "full";
}

function threadTypeLabel(item: MessageCenterStreamItem & { source: "thread" }): string {
  return item.threadType === "task_ticket"
    ? "Task"
    : item.threadType === "support"
      ? "Support"
      : item.threadType === "mag_group"
        ? "MAG"
        : item.threadType.replace(/_/g, " ");
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
    return firstLine ? `${formLabel} · ${firstLine}` : `Form submission · ${formLabel}`;
  }
  return item.body?.trim() ? item.body : "Notification";
}

function resolveHref(item: MessageCenterStreamItem): string {
  if (item.source === "thread") {
    if (item.threadType === "task_ticket" && item.taskId) {
      return `/admin/projects/tasks/${item.taskId}`;
    }
    if (item.threadType === "support" && item.contactId) {
      return `/admin/crm/contacts/${item.contactId}`;
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
  if (item.source === "thread") return item.threadType;
  return item.displayKind ?? item.timelineKind ?? null;
}

export function DashboardActivityStream({
  initialItems,
  contactId = null,
  compact = false,
  layout = "card",
}: DashboardActivityStreamProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<MessageCenterStreamFilter>("all");
  const [items, setItems] = useState<MessageCenterStreamItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [canApproveReject, setCanApproveReject] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(() => new Set());
  const [markingRead, setMarkingRead] = useState(false);
  const [datePreset, setDatePreset] = useState<MessageCenterDatePreset>("initial");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  /** Committed custom range (fetch uses this when preset is custom). */
  const [customRangeApplied, setCustomRangeApplied] = useState<{
    date_from: string;
    date_to: string;
  } | null>(null);

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
    const useInitialOnly = typeFilter === "all" && !hasActiveDateRange;
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
  }, [typeFilter, initialItems, messageCenterQuery, dateQueryKey, hasActiveDateRange]);

  const toggleThreadSelected = (threadId: string) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  };

  const markThreadsRead = async (threadIds: string[]) => {
    const unique = [...new Set(threadIds.filter(Boolean))];
    if (unique.length === 0) return;
    setMarkingRead(true);
    try {
      const res = await fetch("/api/admin/message-center/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadIds: unique }),
      });
      if (res.ok) {
        setSelectedThreadIds(new Set());
        router.refresh();
      }
    } finally {
      setMarkingRead(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/me/context", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx: { canApproveReject?: boolean } | null) => {
        setCanApproveReject(!!ctx?.canApproveReject);
      })
      .catch(() => setCanApproveReject(false));
  }, []);

  const handleCommentStatus = async (noteId: string, status: "approved" | "rejected") => {
    setModeratingId(noteId);
    try {
      const res = await fetch(`/api/blog/comments/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setModeratingId(null);
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
        return (
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

  const visibleUnreadThreadIds = useMemo(() => {
    const ids: string[] = [];
    for (const item of filtered) {
      if (item.source === "thread" && item.unread) ids.push(item.threadId);
    }
    return ids;
  }, [filtered]);

  const selectedUnreadToMark = useMemo(() => {
    return [...selectedThreadIds].filter((id) => {
      const row = filtered.find((i) => i.source === "thread" && i.threadId === id);
      return row?.source === "thread" && row.unread;
    });
  }, [filtered, selectedThreadIds]);

  const resetControls = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setDatePreset("initial");
    setCustomDateFrom("");
    setCustomDateTo("");
    setCustomRangeApplied(null);
    setCustomDateDialogOpen(false);
  }, []);

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={markingRead || selectedUnreadToMark.length === 0}
              onClick={() => markThreadsRead(selectedUnreadToMark)}
            >
              Mark selected read
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={markingRead || visibleUnreadThreadIds.length === 0}
              onClick={() => markThreadsRead(visibleUnreadThreadIds)}
            >
              Mark all visible unread
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {contactId?.trim()
            ? "Threads and activity for this contact only. Use the filter for messages vs notifications."
            : layout === "full"
              ? "Newest first. Choose a date window to load older activity, then filter by type (e.g. orders) — cap still applies per load."
              : "Newest first — optional date window + type filter. Same list as the full Message Center page."}
        </p>
        <p className="text-xs text-muted-foreground">
          Multi-select applies to{" "}
          <span className="text-foreground font-medium">conversations only</span>
          : use the checkbox on the left (notifications and other rows have no checkbox). Open a row from its title
          link.
        </p>
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
        <div
          className={`overflow-y-auto space-y-1 ${
            compact
              ? "max-h-[280px]"
              : layout === "full"
                ? "max-h-[min(75vh,52rem)] min-h-[320px]"
                : "max-h-[360px]"
          }`}
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No items match</p>
          ) : (
            filtered.map((item) => {
              const href = resolveHref(item);
              const badge = kindBadge(item);
              const subLine =
                item.source === "thread"
                  ? item.authorLabel
                    ? `${item.contactName} · ${item.authorLabel}`
                    : item.contactName
                  : item.contactName;
              const isPendingComment =
                item.source === "timeline" &&
                item.timelineKind === "blog_comment" &&
                item.status === "pending" &&
                item.id;
              const isThread = item.source === "thread";
              const showUnread = isThread && item.unread;
              return (
                <div
                  key={`${item.source}-${item.id}-${item.at}`}
                  className={`flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group ${
                    showUnread ? "bg-primary/5 border border-primary/15" : ""
                  }`}
                >
                  <div
                    className="flex w-9 shrink-0 items-start justify-center pt-0.5"
                    title={isThread ? "Select for mark read" : undefined}
                  >
                    {isThread ? (
                      <div
                        className="inline-flex"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedThreadIds.has(item.threadId)}
                          onCheckedChange={() => toggleThreadSelected(item.threadId)}
                          aria-label={`Select conversation thread (${item.threadType}) for mark read`}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex w-3 shrink-0 justify-center pt-1.5">
                    {showUnread ? (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        title="Unread"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <Link href={href} className="flex-1 min-w-0 text-sm transition-colors">
                    <p className={`truncate ${showUnread ? "font-medium" : ""}`}>
                      {formatListPrimaryLine(item, search)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{subLine}</span>
                      <span>·</span>
                      <span>{new Date(item.at).toLocaleString()}</span>
                      {badge && (
                        <span className="inline-flex rounded px-1 py-0.5 text-[10px] font-medium bg-muted">
                          {badge}
                        </span>
                      )}
                    </p>
                  </Link>
                  {canApproveReject && isPendingComment && item.id && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={moderatingId === item.id}
                        onClick={() => handleCommentStatus(item.id!, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={moderatingId === item.id}
                        onClick={() => handleCommentStatus(item.id!, "rejected")}
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
      </CardContent>
    </Card>
  );
}
