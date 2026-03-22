"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare } from "lucide-react";
import type { CrmNote } from "@/lib/supabase/crm";
import { avatarBgClass, initialsFromLabel } from "@/lib/tasks/display-helpers";
import { cn } from "@/lib/utils";

interface TaskThreadSectionProps {
  taskId: string;
  initialNotes: CrmNote[];
  /** Resolved display labels for note author_id (handle/display_name). */
  authorLabels: Record<string, string>;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

/**
 * Task conversation: threaded-style list + add comment (crm_notes / task thread).
 */
export function TaskThreadSection({
  taskId,
  initialNotes,
  authorLabels,
}: TaskThreadSectionProps) {
  const [notes, setNotes] = useState<CrmNote[]>(initialNotes);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed, note_type: "task" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add comment");
        return;
      }
      setNotes((prev) => [...prev, data]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <Card variant="bento" className="task-bento-tile">
      <CardHeader className="space-y-1 px-5 pb-2 pt-5">
        <h2 className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <MessageSquare className="h-4 w-4 text-foreground/70" aria-hidden />
          Discussion ({notes.length})
        </h2>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((note) => {
              const authorName = note.author_id ? authorLabels[note.author_id] ?? "User" : "User";
              const seed = note.author_id ?? note.id;
              return (
                <li key={note.id} className="flex gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                      avatarBgClass(seed)
                    )}
                    aria-hidden
                  >
                    {initialsFromLabel(authorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="text-sm font-semibold">{authorName}</span>
                      <time className="text-xs text-muted-foreground" dateTime={note.created_at}>
                        {formatDate(note.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{note.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="task-bento-inset space-y-2 border-0 p-4">
          <Label htmlFor="task-reply-body" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add a comment
          </Label>
          <Textarea
            id="task-reply-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="resize-none rounded-xl border-border/50 bg-background/80 backdrop-blur-sm"
            disabled={saving}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!body.trim() || saving}>
            {saving ? "Posting…" : "Post comment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
