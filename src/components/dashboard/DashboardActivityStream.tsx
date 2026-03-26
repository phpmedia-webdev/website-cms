"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { MessageCenterStreamItem } from "@/lib/message-center/admin-stream";
import { MESSAGE_CENTER_ADMIN_FILTER_OPTIONS } from "@/lib/message-center/admin-filters";
import type { MessageCenterStreamFilter } from "@/lib/message-center/admin-stream";

interface DashboardActivityStreamProps {
  initialItems: MessageCenterStreamItem[];
}

function formatItem(item: MessageCenterStreamItem): string {
  if (item.source === "thread") {
    const label =
      item.threadType === "task_ticket"
        ? "Task"
        : item.threadType === "support"
          ? "Support"
          : item.threadType === "mag_group"
            ? "MAG"
            : item.threadType.replace(/_/g, " ");
    return `${label}: ${item.preview}`;
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
  if (item.orderId) return `/admin/ecommerce/orders/${item.orderId}`;
  if (item.contentId) return `/admin/content/${item.contentId}/edit`;
  if (item.contactId) return `/admin/crm/contacts/${item.contactId}`;
  return "#";
}

function kindBadge(item: MessageCenterStreamItem): string | null {
  if (item.source === "thread") return item.threadType;
  return item.displayKind ?? item.timelineKind ?? null;
}

export function DashboardActivityStream({ initialItems }: DashboardActivityStreamProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<MessageCenterStreamFilter>("all");
  const [items, setItems] = useState<MessageCenterStreamItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [canApproveReject, setCanApproveReject] = useState(false);

  useEffect(() => {
    if (typeFilter === "all") {
      setItems(initialItems);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/message-center?filter=${encodeURIComponent(typeFilter)}&limit=90`, {
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
  }, [typeFilter, initialItems]);

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
          return (
            i.preview.toLowerCase().includes(q) ||
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Message Center</CardTitle>
        <p className="text-xs text-muted-foreground">
          Thread heads (conversations) and contact timeline notifications in one stream. Filters use Customizer-backed
          categories where configured (migration 214).
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MessageCenterStreamFilter)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs max-w-[200px]"
          >
            {MESSAGE_CENTER_ADMIN_FILTER_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-[360px] overflow-y-auto space-y-1">
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
              return (
                <div
                  key={`${item.source}-${item.id}-${item.at}`}
                  className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group"
                >
                  <Link href={href} className="flex-1 min-w-0 text-sm transition-colors">
                    <p className="truncate">{formatItem(item)}</p>
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
