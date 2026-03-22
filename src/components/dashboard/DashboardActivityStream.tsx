"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { DashboardActivityItem } from "@/lib/supabase/crm";
import { ADMIN_MESSAGES_NOTIFICATIONS_FILTER_OPTIONS } from "@/lib/supabase/crm";

interface DashboardActivityStreamProps {
  initialItems: DashboardActivityItem[];
}

function formatItem(item: DashboardActivityItem): string {
  switch (item.type) {
    case "notification_timeline":
      return item.body?.trim() ? item.body : "Notification";
    case "message":
      return item.body?.trim() ? item.body : "Message";
    case "note":
      return item.body?.trim() ? item.body : "Note";
    case "blog_comment":
      return item.body?.trim() ? item.body : "Comment";
    case "form_submission":
      return `Submitted ${item.formName ?? "form"}`;
    case "contact_added":
      return "Contact added";
    case "mag_assignment":
      return `Added ${item.contactName} to ${item.magName ?? "MAG"}`;
    case "marketing_list":
      return `Added ${item.contactName} to list ${item.listName ?? "List"}`;
    case "order":
      return item.body ?? "Order";
    default:
      return "";
  }
}

export function DashboardActivityStream({ initialItems }: DashboardActivityStreamProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [canApproveReject, setCanApproveReject] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me/context", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
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
    let list = initialItems;
    if (typeFilter !== "all") {
      list = list.filter((i) => i.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.contactName.toLowerCase().includes(q) ||
          (i.body?.toLowerCase().includes(q)) ||
          (i.formName?.toLowerCase().includes(q)) ||
          (i.magName?.toLowerCase().includes(q)) ||
          (i.listName?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [initialItems, typeFilter, search]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Messages and Notifications</CardTitle>
        <p className="text-xs text-muted-foreground">
          Contact timeline rows, blog comments, form submissions, new contacts, MAG and list assignments, and orders. Grows as more events write to{" "}
          <code className="text-[10px]">contact_notifications_timeline</code> and thread tables. Click a row to open the contact, post, or order.
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
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            {ADMIN_MESSAGES_NOTIFICATIONS_FILTER_OPTIONS.map(({ value, label }) => (
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
              const href =
                item.type === "order" && item.orderId
                  ? `/admin/ecommerce/orders/${item.orderId}`
                  : item.type === "blog_comment" && item.contentId
                    ? `/admin/content/${item.contentId}/edit`
                    : item.contactId
                      ? `/admin/crm/contacts/${item.contactId}`
                      : "#";
              const isPendingComment = item.type === "blog_comment" && item.status === "pending" && item.id;
              return (
              <div
                key={`${item.type}-${item.at}-${item.contactId}-${item.contentId ?? ""}-${item.id ?? ""}-${item.orderId ?? ""}-${item.magName ?? ""}-${item.listName ?? ""}`}
                className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group"
              >
                <Link href={href} className="flex-1 min-w-0 text-sm transition-colors">
                  <p className="truncate">{formatItem(item)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span>{item.contactName}</span>
                    <span>·</span>
                    <span>{new Date(item.at).toLocaleString()}</span>
                    {item.noteType && (
                      <span className="inline-flex rounded px-1 py-0.5 text-[10px] font-medium bg-muted">
                        {item.noteType}
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
