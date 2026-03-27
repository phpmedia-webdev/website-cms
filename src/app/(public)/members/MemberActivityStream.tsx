"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageSquarePlus } from "lucide-react";
import type { DashboardActivityItem } from "@/lib/supabase/crm";
import { MEMBER_ACTIVITY_TYPE_FILTER_OPTIONS } from "@/lib/supabase/crm";

function formatItem(item: DashboardActivityItem): string {
  switch (item.type) {
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
      return `Added to ${item.magName ?? "MAG"}`;
    case "marketing_list":
      return `Added to list ${item.listName ?? "List"}`;
    case "order":
      return item.body ?? "Order";
    default:
      return "";
  }
}

export function MemberActivityStream() {
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter: typeFilter,
        limit: "80",
      });
      const res = await fetch(`/api/members/message-center?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setActivity(data.items ?? data.activity ?? []);
    } catch {
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const filtered = useMemo(() => {
    let list = activity;
    if (typeFilter !== "all") {
      if (typeFilter === "note") {
        list = list.filter((i) => i.type === "note" && i.noteType !== "email_sent" && i.noteType !== "message" && i.noteType !== "task_status_change");
      } else if (typeFilter === "email_sent") {
        list = list.filter((i) => i.type === "note" && i.noteType === "email_sent");
      } else if (typeFilter === "task_status_change") {
        list = list.filter((i) => i.type === "note" && i.noteType === "task_status_change");
      } else {
        list = list.filter((i) => i.type === typeFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.body?.toLowerCase().includes(q)) ||
          (i.formName?.toLowerCase().includes(q)) ||
          (i.contactName?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activity, typeFilter, search]);

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
        setTypeFilter("message");
        await fetchActivity();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to send");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Messages and notifications</CardTitle>
        <p className="text-xs text-muted-foreground">
          Your orders, messages with support, form submissions, and more. Use &quot;Add new message&quot; to contact support.
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
            aria-label="Filter by type"
          >
            {MEMBER_ACTIVITY_TYPE_FILTER_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="default" className="h-8" onClick={() => setMessageOpen(true)}>
            <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
            Add new message
          </Button>
        </div>

        {messageOpen && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <textarea
              placeholder="Type your message to support..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSendMessage} disabled={sending || !messageBody.trim()}>
                {sending ? "Sending…" : "Send"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setMessageOpen(false); setMessageBody(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[320px] overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading activity…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No activity matches</p>
          ) : (
            filtered.map((item) => {
              const href =
                item.type === "order" && item.orderId
                  ? `/members/orders/${item.orderId}`
                  : "#";
              return (
                <div
                  key={`${item.type}-${item.at}-${item.id ?? ""}-${item.orderId ?? ""}`}
                  className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50 text-sm"
                >
                  {href !== "#" ? (
                    <Link href={href} className="flex-1 min-w-0">
                      <p className="truncate">{formatItem(item)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.at).toLocaleString()}</p>
                    </Link>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{formatItem(item)}</p>
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
