"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Trash2 } from "lucide-react";
import type { TaskTimeLog } from "@/lib/supabase/projects";

interface TaskTimeLogsSectionProps {
  taskId: string;
  initialLogs: TaskTimeLog[];
  /** Display name for user_id */
  userLabels: Record<string, string>;
  /** Display name for contact_id */
  contactLabels: Record<string, string>;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

function whoLabel(log: TaskTimeLog, userLabels: Record<string, string>, contactLabels: Record<string, string>): string {
  if (log.user_id) {
    const name = userLabels[log.user_id]?.trim();
    if (name) return name;
    return "User"; // Logged-in user (e.g. admin/superadmin) when label not resolved
  }
  if (log.contact_id && contactLabels[log.contact_id]) return contactLabels[log.contact_id];
  return "—";
}

export function TaskTimeLogsSection({
  taskId,
  initialLogs,
  userLabels,
  contactLabels,
}: TaskTimeLogsSectionProps) {
  const [logs, setLogs] = useState<TaskTimeLog[]>(initialLogs);
  const [logDate, setLogDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const totalMinutes = logs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(minutes, 10);
    if (!logDate || !Number.isInteger(mins) || mins < 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_date: logDate, minutes: mins, note: note.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to add time");
      }
      const { id } = await res.json();
      setLogs((prev) => [
        { id, task_id: taskId, user_id: null, contact_id: null, log_date: logDate, minutes: mins, note: note.trim() || null, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setMinutes("");
      setNote("");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to add time");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (deletingId) return;
    setDeletingId(logId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-logs/${logId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      router.refresh();
    } catch {
      alert("Failed to delete time log");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time logs
            {totalMinutes > 0 && (
              <span className="text-muted-foreground font-normal">
                (Total: {totalMinutes} min)
              </span>
            )}
          </h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="tl-date">Date</Label>
            <Input
              id="tl-date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
              className="w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tl-minutes">Minutes</Label>
            <Input
              id="tl-minutes"
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              required
              className="w-[100px]"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[160px]">
            <Label htmlFor="tl-note">Note (optional)</Label>
            <Input
              id="tl-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was done"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add time"}
          </Button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time logged yet.</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Who</th>
                  <th className="text-right p-2 font-medium">Minutes</th>
                  <th className="text-left p-2 font-medium">Note</th>
                  <th className="w-10 p-2" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="p-2">{formatDate(log.log_date)}</td>
                    <td className="p-2">{whoLabel(log, userLabels, contactLabels)}</td>
                    <td className="p-2 text-right">{log.minutes}</td>
                    <td className="p-2 text-muted-foreground max-w-[200px] truncate" title={log.note ?? undefined}>
                      {log.note ?? "—"}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        aria-label="Delete time log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
