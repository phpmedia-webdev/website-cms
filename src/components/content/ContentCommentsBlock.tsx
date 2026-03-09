"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CommentWithAuthor {
  id: string;
  body: string;
  author_id: string | null;
  status: string | null;
  created_at: string;
  authorDisplayName?: string;
}

interface ContentCommentsBlockProps {
  contentId: string;
}

export function ContentCommentsBlock({ contentId }: ContentCommentsBlockProps) {
  const [canApproveReject, setCanApproveReject] = useState<boolean | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctxRes = await fetch("/api/admin/me/context", { cache: "no-store" });
        if (!ctxRes.ok) {
          if (!cancelled) setCanApproveReject(false);
          return;
        }
        const ctx = (await ctxRes.json()) as { canApproveReject?: boolean };
        if (!cancelled) setCanApproveReject(!!ctx.canApproveReject);
        if (!ctx.canApproveReject) return;
        const commentsRes = await fetch(
          `/api/blog/comments?content_id=${encodeURIComponent(contentId)}&status=all`,
          { cache: "no-store" }
        );
        if (!commentsRes.ok || cancelled) return;
        const data = (await commentsRes.json()) as CommentWithAuthor[];
        if (!cancelled) setComments(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCanApproveReject(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const handleStatus = async (noteId: string, status: "approved" | "rejected") => {
    setModeratingId(noteId);
    try {
      const res = await fetch(`/api/blog/comments/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const next = comments.map((c) =>
          c.id === noteId ? { ...c, status } : c
        );
        setComments(next);
      }
    } finally {
      setModeratingId(null);
    }
  };

  if (loading || canApproveReject === null) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading comments…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canApproveReject) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comments</CardTitle>
        <p className="text-xs text-muted-foreground">
          Moderate blog comments. Approved comments appear on the public post.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">
                    {c.authorDisplayName ?? "Commenter"}
                  </span>
                  <span>·</span>
                  <time dateTime={c.created_at}>
                    {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </time>
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      c.status === "approved"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : c.status === "rejected"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {c.status ?? "pending"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap mb-2">{c.body}</p>
                {c.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderatingId === c.id}
                      onClick={() => handleStatus(c.id, "approved")}
                    >
                      {moderatingId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={moderatingId === c.id}
                      onClick={() => handleStatus(c.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
