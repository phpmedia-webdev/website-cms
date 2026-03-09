"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export interface BlogCommentDisplay {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
}

interface BlogPostCommentsProps {
  contentId: string;
  comments: BlogCommentDisplay[];
  /** True when user is authenticated and has verified email (can post comments). */
  canPostComment: boolean;
  /** Current path for login redirect (e.g. /blog/my-post) */
  redirectPath?: string;
}

export function BlogPostComments({
  contentId,
  comments,
  canPostComment,
  redirectPath = "/blog",
}: BlogPostCommentsProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId, body: body.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to post comment");
      }
      setBody("");
      setMessage("success");
      router.refresh();
    } catch (err) {
      setMessage("error");
      console.error("Comment submit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 pt-8 border-t" aria-label="Comments">
      <h2 className="text-xl font-semibold mb-4">Comments</h2>
      {comments.length > 0 && (
        <ul className="space-y-4 mb-8">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {c.authorName} · {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      {canPostComment ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            maxLength={2000}
            disabled={submitting}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitting || !body.trim()}>
              {submitting ? "Posting…" : "Post comment"}
            </Button>
            {message === "success" && (
              <span className="text-sm text-green-600">Your comment is awaiting moderation.</span>
            )}
            {message === "error" && (
              <span className="text-sm text-destructive">Failed to post. Try again.</span>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Users must log in to post comments.{" "}
          <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="underline">
            Sign in
          </Link>
        </p>
      )}
    </section>
  );
}
