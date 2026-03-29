"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberMessageCenterStreamItem } from "@/lib/message-center/gpum-message-center";
import { getMemberStreamItemPrimaryLine } from "@/lib/message-center/gpum-message-center";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 5;

/**
 * Dashboard slice of the GPUM message center — latest rows + “See all” (Phase 4.3).
 * Full filters, search, and inline threads live on `/members/messages`.
 */
export function MemberMessagesPreview() {
  const [items, setItems] = useState<MemberMessageCenterStreamItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/members/message-center?filter=all&limit=${PREVIEW_LIMIT}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { streamItems?: MemberMessageCenterStreamItem[] };
      const list = Array.isArray(data.streamItems) ? data.streamItems : [];
      setItems(list.slice(0, PREVIEW_LIMIT));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Recent messages and notifications</CardTitle>
        <Link
          href="/members/messages"
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          See all
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground py-2">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1 leading-relaxed">
            Nothing new to show yet. Open{" "}
            <Link href="/members/messages" className="text-primary underline underline-offset-2">
              Messages and notifications
            </Link>{" "}
            for filters, search, and conversations.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}-${item.at}`} className="text-sm">
                <p
                  className={cn(
                    "line-clamp-2",
                    item.kind === "conversation_head" && item.unread && "font-semibold"
                  )}
                >
                  {getMemberStreamItemPrimaryLine(item)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                  {new Date(item.at).toLocaleString()}
                  {item.kind === "conversation_head" && item.unread ? (
                    <span className="ml-2 text-primary font-medium">Unread</span>
                  ) : null}
                </p>
                {item.kind === "announcement_feed" && item.announcementsOnly ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Announcements only — member posts are off for this group.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
