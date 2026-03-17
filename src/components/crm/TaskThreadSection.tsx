"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CrmNote } from "@/lib/supabase/crm";

interface TaskThreadSectionProps {
  taskId: string;
  initialNotes: CrmNote[];
  /** Resolved display labels for note author_id (handle/display_name). */
  authorLabels: Record<string, string>;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

/**
 * Task conversation (thread) section: list notes for this task and "Add reply" form.
 * Uses unified conversation_uid = task:taskId; author labels show handle when set.
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
        setError(data.error ?? "Failed to add reply");
        return;
      }
      setNotes((prev) => [...prev, data]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Thread</h2>
        <p className="text-sm text-muted-foreground">
          Conversation for this task (support ticket thread).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replies yet. Add one below.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {note.author_id ? authorLabels[note.author_id] ?? "User" : "User"}
                  </span>
                  <span>{formatDate(note.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="task-reply-body">Add reply</Label>
          <Textarea
            id="task-reply-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="resize-none"
            disabled={saving}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!body.trim() || saving}>
            {saving ? "Sending…" : "Send reply"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
