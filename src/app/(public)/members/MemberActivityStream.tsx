"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  CircleDollarSign,
  type LucideIcon,
  MessageSquarePlus,
  MessageSquareText,
  MessagesSquare,
  RotateCcw,
  Search,
} from "lucide-react";
import type { MemberMessageCenterStreamItem } from "@/lib/message-center/gpum-message-center";
import type { ThreadMessageAuthorMeta } from "@/lib/message-center/thread-message-author-enrichment";
import { MEMBER_MESSAGE_CENTER_FILTER_OPTIONS } from "@/lib/message-center/gpum-message-center";
import { cn } from "@/lib/utils";
import { normalizeMessageCenterDateRange } from "@/lib/message-center/date-range";

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

type ThreadMsg = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string | null;
  author_contact_id: string | null;
};

function sortThreadMessagesOldestFirst(rows: ThreadMsg[]): ThreadMsg[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function formatGpumThreadSubline(
  m: ThreadMsg,
  authors: Record<string, ThreadMessageAuthorMeta>,
  memberNames: Record<string, string>
): string {
  const dt = new Date(m.created_at).toLocaleString();
  const cid = m.author_contact_id?.trim();
  if (cid) {
    const name = memberNames[cid]?.trim() || "Member";
    return `Member - ${name} - ${dt}`;
  }
  const uid = m.author_user_id?.trim();
  if (uid) {
    const meta = authors[uid];
    if (meta) {
      return `${meta.roleLabel}, ${meta.displayName}, ${dt}`;
    }
    return dt;
  }
  return `System: ${dt}`;
}

function streamRowVisual(item: MemberMessageCenterStreamItem): {
  icon: LucideIcon;
  iconWrapClass: string;
} {
  if (item.kind === "conversation_head") {
    return {
      icon: MessagesSquare,
      iconWrapClass: "bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300",
    };
  }
  if (item.kind === "announcement_feed") {
    return {
      icon: MessagesSquare,
      iconWrapClass: "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300",
    };
  }
  const t = item.sourceType;
  const note = item.sourceNoteType;
  const isMessage = t === "message" || (t === "note" && note === "message");
  if (isMessage) {
    return {
      icon: MessagesSquare,
      iconWrapClass: "bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300",
    };
  }
  if (t === "blog_comment") {
    return {
      icon: MessageSquareText,
      iconWrapClass: "bg-violet-500/15 border border-violet-500/30 text-violet-700 dark:text-violet-300",
    };
  }
  if (t === "order") {
    return {
      icon: CircleDollarSign,
      iconWrapClass: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    };
  }
  return {
    icon: Bell,
    iconWrapClass: "bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300",
  };
}

function streamPrimaryLine(item: MemberMessageCenterStreamItem): string {
  if (item.kind === "conversation_head") {
    return `${item.threadType === "support" ? "Support" : item.title}: ${item.preview}`;
  }
  return `${item.title}: ${item.preview}`;
}

export function MemberActivityStream() {
  const [streamItems, setStreamItems] = useState<MemberMessageCenterStreamItem[]>([]);
  const [memberContactId, setMemberContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  const [datePreset, setDatePreset] = useState<MessageCenterDatePreset>("initial");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  const [customRangeApplied, setCustomRangeApplied] = useState<{
    date_from: string;
    date_to: string;
  } | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMsg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [threadAuthors, setThreadAuthors] = useState<Record<string, ThreadMessageAuthorMeta>>({});
  const [threadMemberNames, setThreadMemberNames] = useState<Record<string, string>>({});

  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  const dateQueryKey = useMemo(() => {
    if (datePreset === "initial") return "";
    if (datePreset === "custom") {
      if (!customRangeApplied) return "";
      const { date_from, date_to } = customRangeApplied;
      if (!date_from.trim() && !date_to.trim()) return "";
      const norm = normalizeMessageCenterDateRange(date_from || null, date_to || null);
      if (!norm) return "invalid";
      return `${date_from.trim() || ""}|${date_to.trim() || ""}`;
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

  const hasAnythingToReset = useMemo(() => {
    if (search.trim()) return true;
    if (streamFilter !== "all") return true;
    if (datePreset !== "initial") return true;
    if (customRangeApplied) return true;
    if (customDateFrom.trim() || customDateTo.trim()) return true;
    if (customDateDialogOpen) return true;
    return false;
  }, [search, streamFilter, datePreset, customRangeApplied, customDateFrom, customDateTo, customDateDialogOpen]);

  const resetControls = useCallback(() => {
    setSearch("");
    setStreamFilter("all");
    setDatePreset("initial");
    setCustomDateFrom("");
    setCustomDateTo("");
    setCustomRangeApplied(null);
    setCustomDateDialogOpen(false);
  }, []);

  const fetchStream = useCallback(async () => {
    setLoading(true);
    try {
      const useRange = hasActiveDateRange && dateQueryKey !== "invalid";
      const [df, dt] = useRange ? dateQueryKey.split("|") : ["", ""];
      const params = new URLSearchParams({
        filter: streamFilter,
        limit: useRange ? "200" : "80",
      });
      if (useRange && df) params.set("date_from", df);
      if (useRange && dt) params.set("date_to", dt);
      const res = await fetch(`/api/members/message-center?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        streamItems?: MemberMessageCenterStreamItem[];
        memberContactId?: string | null;
      };
      setStreamItems(Array.isArray(data.streamItems) ? data.streamItems : []);
      setMemberContactId(typeof data.memberContactId === "string" ? data.memberContactId : null);
    } catch {
      setStreamItems([]);
    } finally {
      setLoading(false);
    }
  }, [streamFilter, hasActiveDateRange, dateQueryKey]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  useEffect(() => {
    if (!selectedThreadId?.trim()) {
      setThreadMessages([]);
      setThreadAuthors({});
      setThreadMemberNames({});
      setThreadError(null);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    setThreadError(null);
    fetch(
      `/api/conversation-threads/${encodeURIComponent(selectedThreadId)}/messages?limit=200&enrichAuthors=1`,
      { cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch"))))
      .then(
        (d: {
          data?: ThreadMsg[];
          authors?: Record<string, ThreadMessageAuthorMeta>;
          memberContactNames?: Record<string, string>;
        }) => {
          if (cancelled) return;
          const rows = Array.isArray(d.data) ? d.data : [];
          setThreadMessages(sortThreadMessagesOldestFirst(rows));
          setThreadAuthors(d.authors && typeof d.authors === "object" ? d.authors : {});
          setThreadMemberNames(
            d.memberContactNames && typeof d.memberContactNames === "object" ? d.memberContactNames : {}
          );
        }
      )
      .catch(() => {
        if (!cancelled) {
          setThreadMessages([]);
          setThreadError("Could not load conversation.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId]);

  useEffect(() => {
    if (loadingThread || threadError) return;
    const el = transcriptScrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [threadMessages, loadingThread, threadError, selectedThreadId]);

  const filtered = useMemo(() => {
    let list = streamItems;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => {
        const line = streamPrimaryLine(i).toLowerCase();
        if (line.includes(q)) return true;
        if (i.kind === "notification" && i.formName?.toLowerCase().includes(q)) return true;
        return false;
      });
    }
    return list;
  }, [streamItems, search]);

  const handleSendMessage = async () => {
    const text = messageBody.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch("/api/members/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        setMessageBody("");
        setMessageOpen(false);
        setStreamFilter("conversations");
        await fetchStream();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.error === "string" ? data.error : "Failed to send");
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    const tid = selectedThreadId?.trim();
    const text = replyBody.trim();
    const cid = memberContactId?.trim();
    if (!tid || !text || !cid) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/conversation-threads/${encodeURIComponent(tid)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, author_contact_id: cid }),
      });
      if (res.ok) {
        setReplyBody("");
        const r = await fetch(
          `/api/conversation-threads/${encodeURIComponent(tid)}/messages?limit=200&enrichAuthors=1`,
          { cache: "no-store" }
        );
        const d = r.ok
          ? ((await r.json()) as {
              data?: ThreadMsg[];
              authors?: Record<string, ThreadMessageAuthorMeta>;
              memberContactNames?: Record<string, string>;
            })
          : null;
        const rows = Array.isArray(d?.data) ? (d.data as ThreadMsg[]) : [];
        setThreadMessages(sortThreadMessagesOldestFirst(rows));
        if (d?.authors && typeof d.authors === "object") setThreadAuthors(d.authors);
        if (d?.memberContactNames && typeof d.memberContactNames === "object") {
          setThreadMemberNames(d.memberContactNames);
        }
        await fetchStream();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.error === "string" ? data.error : "Failed to send");
      }
    } finally {
      setSendingReply(false);
    }
  };

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setReplyBody("");
    setThreadError(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Messages and notifications</CardTitle>
        <p className="text-xs text-muted-foreground">
          All activity, announcements, and conversations. Open a conversation to reply in-thread. (Functional UI — fork
          may restyle.)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <select
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs min-w-[9rem]"
            aria-label="Filter stream"
          >
            {MEMBER_MESSAGE_CENTER_FILTER_OPTIONS.map(({ value, label }) => (
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
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shrink-0 min-w-[10rem]"
            aria-label="Time range"
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
          <Button size="sm" variant="default" className="h-8" onClick={() => setMessageOpen(true)}>
            <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
            Message support
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
                disabled={(!customDateFrom.trim() && !customDateTo.trim()) || customDraftInvalid}
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

        {messageOpen && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <textarea
              placeholder="Type your message to support..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMessageOpen(false);
                  setMessageBody("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendMessage} disabled={sending || !messageBody.trim()}>
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        )}

        {selectedThreadId ? (
          <div className="space-y-2 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Conversation</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedThreadId(null)}>
                Close
              </Button>
            </div>
            {loadingThread ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : threadError ? (
              <p className="text-xs text-destructive">{threadError}</p>
            ) : (
              <div
                ref={transcriptScrollRef}
                className="max-h-56 overflow-y-auto space-y-1 text-sm"
              >
                {threadMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No messages yet.</p>
                ) : (
                  threadMessages.map((m) => {
                    const isMember = !!m.author_contact_id?.trim();
                    const isStaff = !isMember && !!m.author_user_id?.trim();
                    /** GPUM view: team/support on the left (muted); member sends on the right (blue). */
                    const iconWrapClass = isMember
                      ? "bg-blue-500/15 border border-blue-500/30"
                      : isStaff
                        ? "bg-slate-500/15 border border-slate-500/30"
                        : "bg-zinc-500/10 border border-zinc-500/25";
                    const iconClass = isMember
                      ? "text-blue-700 dark:text-blue-300"
                      : isStaff
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-zinc-600 dark:text-zinc-400";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/50 text-sm",
                          isMember ? "flex-row-reverse" : "flex-row"
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
                        <div className={cn("flex-1 min-w-0", isMember ? "text-right" : "text-left")}>
                          <p className="whitespace-pre-wrap break-words">{m.body?.trim() || "(empty)"}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                            {formatGpumThreadSubline(m, threadAuthors, threadMemberNames)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            <div className="space-y-1">
              <textarea
                placeholder="Reply in this thread…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="w-full min-h-[64px] rounded-md border bg-background px-2 py-1.5 text-sm"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyBody.trim() || !memberContactId}
                >
                  {sendingReply ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="max-h-[320px] overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nothing matches this filter.</p>
          ) : (
            filtered.map((item) => {
              const visual = streamRowVisual(item);
              const Icon = visual.icon;
              const line = streamPrimaryLine(item);
              const threadId =
                item.kind === "conversation_head"
                  ? item.threadId
                  : item.kind === "announcement_feed"
                    ? item.threadId
                    : null;
              const orderHref =
                item.kind === "notification" && item.sourceType === "order" && item.orderId
                  ? `/members/orders/${item.orderId}`
                  : null;

              const onActivate = () => {
                if (threadId) openThread(threadId);
              };

              return (
                <div
                  key={`${item.kind}-${item.id}-${item.at}`}
                  className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50 text-sm"
                >
                  <div
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${visual.iconWrapClass}`}
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {orderHref ? (
                    <Link href={orderHref} className="flex-1 min-w-0">
                      <p className="truncate">{line}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.at).toLocaleString()}</p>
                    </Link>
                  ) : threadId ? (
                    <button
                      type="button"
                      onClick={onActivate}
                      className="flex-1 min-w-0 text-left text-sm hover:underline underline-offset-2"
                    >
                      <p className="truncate">{line}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.at).toLocaleString()}</p>
                    </button>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{line}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.at).toLocaleString()}</p>
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
