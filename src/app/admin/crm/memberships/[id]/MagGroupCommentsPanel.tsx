"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThreadMessageAuthorMeta } from "@/lib/message-center/thread-message-author-enrichment";
import { threadMessageIsAdminBroadcast } from "@/lib/message-center/thread-message-metadata";
import { Loader2, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type ThreadMsg = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string | null;
  author_contact_id: string | null;
  metadata?: Record<string, unknown> | null;
};

function formatSubline(
  m: ThreadMsg,
  authors: Record<string, ThreadMessageAuthorMeta>,
  contactNames: Record<string, string>
): string {
  const dt = new Date(m.created_at).toLocaleString();
  const cid = m.author_contact_id?.trim();
  if (cid) {
    const name = contactNames[cid]?.trim() || "Member";
    return `Member · ${name} · ${dt}`;
  }
  const uid = m.author_user_id?.trim();
  if (uid) {
    const meta = authors[uid];
    if (meta) return `${meta.roleLabel} · ${meta.displayName} · ${dt}`;
    return dt;
  }
  return dt;
}

/**
 * Admin COMMENT:GROUP thread for a MAG — group comments only; broadcasts stay in notifications / Message Center.
 */
export function MagGroupCommentsPanel({ magId, magName }: { magId: string; magName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [allowConversations, setAllowConversations] = useState(true);
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [authors, setAuthors] = useState<Record<string, ThreadMessageAuthorMeta>>({});
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const conversationMessages = useMemo(
    () => messages.filter((m) => !threadMessageIsAdminBroadcast(m.metadata)),
    [messages]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/mags/${encodeURIComponent(magId)}/group-thread`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        threadId?: string | null;
        data?: ThreadMsg[];
        authors?: Record<string, ThreadMessageAuthorMeta>;
        contactNames?: Record<string, string>;
        mag?: { allow_conversations?: boolean };
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to load");
        setThreadId(null);
        setMessages([]);
        return;
      }
      setThreadId(typeof data.threadId === "string" ? data.threadId : null);
      setMessages(Array.isArray(data.data) ? data.data : []);
      setAuthors(data.authors && typeof data.authors === "object" ? data.authors : {});
      setContactNames(data.contactNames && typeof data.contactNames === "object" ? data.contactNames : {});
      const ac = data.mag?.allow_conversations;
      setAllowConversations(ac === undefined || ac === null ? true : Boolean(ac));
    } catch {
      setError("Failed to load");
      setThreadId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [magId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/mags/${encodeURIComponent(magId)}/group-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to send");
        return;
      }
      setDraft("");
      await load();
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-2 sm:p-3 pb-0">
        <CardTitle className="text-base">COMMENT:GROUP</CardTitle>
        <p className="text-xs text-muted-foreground leading-snug">
          Shared group comment thread for <strong>{magName}</strong>. Your first post creates the room for enrolled
          members while comments are allowed for this MAG. <strong>Announcements</strong> (broadcasts with an audience)
          live in Message Center / notifications — they are not shown here.
        </p>
        {!allowConversations ? (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Comments are off for this MAG — you can still post as tenant admin when policy allows.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="p-2 sm:p-3 space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-2 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading thread…
          </p>
        ) : error && messages.length === 0 && !threadId ? (
          <p className="text-xs text-destructive py-1">{error}</p>
        ) : null}

        {!loading && !threadId && messages.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2">
            No group thread yet — post below to start <strong>COMMENT:GROUP</strong> for this membership. Members will
            see it in their message center when enrolled and comments are allowed.
          </p>
        ) : null}

        {conversationMessages.length > 0 ? (
          <div className="max-h-[min(50vh,22rem)] overflow-y-auto space-y-1 rounded-md border bg-muted/15 p-2">
            {conversationMessages.map((m) => {
              const sub = formatSubline(m, authors, contactNames);
              const cid = m.author_contact_id?.trim();

              const isMember = !!m.author_contact_id?.trim();
              const isStaff = !isMember && !!m.author_user_id?.trim();
              /** Admin view: member left (violet), staff right (blue — same as Message Center transcript). */
              const iconWrap = isMember
                ? "bg-violet-500/15 border border-violet-500/30"
                : isStaff
                  ? "bg-blue-500/15 border border-blue-500/30"
                  : "bg-zinc-500/10 border border-zinc-500/25";
              const iconClass = isMember
                ? "text-violet-700 dark:text-violet-300"
                : isStaff
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-zinc-600 dark:text-zinc-400";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40",
                    isMember ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                      iconWrap
                    )}
                    aria-hidden
                  >
                    <MessagesSquare className={cn("h-3.5 w-3.5", iconClass)} />
                  </div>
                  <div className={cn("flex-1 min-w-0", isMember ? "text-left" : "text-right")}>
                    <p className="whitespace-pre-wrap break-words">{m.body?.trim() || "(empty)"}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {cid ? (
                        <Link
                          href={`/admin/crm/contacts/${encodeURIComponent(cid)}`}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {sub}
                        </Link>
                      ) : (
                        sub
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading && threadId && conversationMessages.length === 0 && messages.length > 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2">
            No conversation messages yet. Broadcast announcements stay in Message Center — they are not listed here.
          </p>
        ) : !loading && threadId && messages.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2">
            No messages yet — post below to start the conversation.
          </p>
        ) : null}

        {error && (messages.length > 0 || threadId) ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="mag-group-comment" className="text-xs font-medium">
            Add a message
          </label>
          <textarea
            id="mag-group-comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write to the membership group…"
            className="w-full min-h-[88px] rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim()}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
