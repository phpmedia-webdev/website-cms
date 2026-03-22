"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DurationPicker } from "@/components/ui/duration-picker";
import { Clock, Play, Trash2 } from "lucide-react";
import type { TaskTimeLog } from "@/lib/supabase/projects";
import {
  avatarBgClass,
  formatMinutesAsHrsMin,
  formatShortMonthDay,
  initialsFromLabel,
} from "@/lib/tasks/display-helpers";
import { cn } from "@/lib/utils";
import {
  isTaskStatusCompletedSlug,
  TASK_STATUS_SLUG_COMPLETED,
  TASK_STATUS_SLUG_IN_PROGRESS,
} from "@/lib/tasks/task-status-reserved";

interface TaskTimeLogsSectionProps {
  taskId: string;
  initialLogs: TaskTimeLog[];
  /** Display name for user_id */
  userLabels: Record<string, string>;
  /** Display name for contact_id */
  contactLabels: Record<string, string>;
  /** Current task status slug (Customizer); drives "Mark complete". */
  taskStatusSlug: string | null | undefined;
  /** After status PUT succeeds (e.g. sync Schedule Status select on task edit). */
  onTaskStatusSlugChange?: (slug: string) => void;
  /** Estimated minutes (task proposed_time) for progress bar; omit when unknown */
  estimatedMinutes?: number | null;
  /** When true, show a button + modal to update estimated time (task edit). Detail view: false. */
  canEditEstimate?: boolean;
}

function whoLabel(log: TaskTimeLog, userLabels: Record<string, string>, contactLabels: Record<string, string>): string {
  if (log.user_id) {
    const name = userLabels[log.user_id]?.trim();
    if (name) return name;
    return "User";
  }
  if (log.contact_id && contactLabels[log.contact_id]) return contactLabels[log.contact_id];
  return "—";
}

function whoKey(log: TaskTimeLog): string {
  return log.user_id ?? log.contact_id ?? log.id;
}

/** Positive minutes used for progress bar; null/0 = no estimate set. */
function effectiveEstimatedMinutes(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw);
}

export function TaskTimeLogsSection({
  taskId,
  initialLogs,
  userLabels,
  contactLabels,
  taskStatusSlug,
  onTaskStatusSlugChange,
  estimatedMinutes,
  canEditEstimate = false,
}: TaskTimeLogsSectionProps) {
  const [logs, setLogs] = useState<TaskTimeLog[]>(initialLogs);
  const [estimated, setEstimated] = useState<number | null>(() => effectiveEstimatedMinutes(estimatedMinutes ?? null));

  const [logDate, setLogDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const [estimateModalOpen, setEstimateModalOpen] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState<number | null>(null);
  const [estimateSaving, setEstimateSaving] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    setEstimated(effectiveEstimatedMinutes(estimatedMinutes ?? null));
  }, [estimatedMinutes]);

  const totalMinutes = logs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const estimatedForBar = estimated;
  const progressPct =
    estimatedForBar != null && estimatedForBar > 0
      ? Math.min(100, Math.round((totalMinutes / estimatedForBar) * 100))
      : null;
  const overEstimate =
    estimatedForBar != null && estimatedForBar > 0 && totalMinutes > estimatedForBar;

  const openEstimateModal = () => {
    setEstimateError(null);
    setEstimateDraft(estimated ?? null);
    setEstimateModalOpen(true);
  };

  const saveEstimate = async () => {
    setEstimateError(null);
    setEstimateSaving(true);
    try {
      const proposed_time = estimateDraft != null && estimateDraft > 0 ? estimateDraft : null;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposed_time }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstimateError(typeof data?.error === "string" ? data.error : "Failed to save estimate");
        return;
      }
      setEstimated(effectiveEstimatedMinutes(proposed_time ?? undefined));
      setEstimateModalOpen(false);
      router.refresh();
    } catch (e) {
      setEstimateError(e instanceof Error ? e.message : "Failed to save estimate");
    } finally {
      setEstimateSaving(false);
    }
  };

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
        {
          id,
          task_id: taskId,
          user_id: null,
          contact_id: null,
          log_date: logDate,
          minutes: mins,
          note: note.trim() || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setMinutes("");
      setNote("");
      setQuickAddOpen(false);
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

  const sortedForDisplay = [...logs].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  );

  const estimatedDisplay =
    estimated != null ? formatMinutesAsHrsMin(estimated) : null;

  const markCompleteChecked = isTaskStatusCompletedSlug(taskStatusSlug);

  const handleMarkCompleteChange = async (checked: boolean) => {
    const nextSlug = checked ? TASK_STATUS_SLUG_COMPLETED : TASK_STATUS_SLUG_IN_PROGRESS;
    setCompleteError(null);
    setCompleteSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status_slug: nextSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCompleteError(typeof data?.error === "string" ? data.error : "Could not update status");
        return;
      }
      onTaskStatusSlugChange?.(nextSlug);
      router.refresh();
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setCompleteSaving(false);
    }
  };

  return (
    <Card variant="bento" className="task-bento-tile">
      <CardHeader className="space-y-1 px-5 pb-2 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Clock className="h-4 w-4 text-foreground/70" aria-hidden />
            Time tracking
          </h3>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-white/70 bg-background/80 shadow-sm backdrop-blur-sm"
              onClick={() => setQuickAddOpen((o) => !o)}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              {quickAddOpen ? "Close" : "Log time"}
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`task-mark-complete-${taskId}`}
                checked={markCompleteChecked}
                disabled={completeSaving}
                onCheckedChange={(v) => {
                  if (v === "indeterminate") return;
                  void handleMarkCompleteChange(v === true);
                }}
                aria-label="Mark task complete"
              />
              <Label
                htmlFor={`task-mark-complete-${taskId}`}
                className={cn(
                  "text-sm font-normal leading-none text-foreground",
                  completeSaving ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                )}
              >
                Mark complete
              </Label>
            </div>
          </div>
        </div>
        {completeError && (
          <p className="text-xs text-destructive" role="alert">
            {completeError}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[9rem] space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated</p>
            {canEditEstimate ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full max-w-[220px] justify-center rounded-xl border-border/60 bg-background/90 px-4 py-2 text-left font-semibold tabular-nums shadow-sm backdrop-blur-sm sm:w-auto"
                onClick={openEstimateModal}
              >
                {estimatedDisplay ?? "Set estimated time"}
              </Button>
            ) : (
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {estimatedDisplay ?? "—"}
              </p>
            )}
          </div>
          <div className="min-w-[9rem] space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Logged</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {formatMinutesAsHrsMin(totalMinutes)}
            </p>
          </div>
          {progressPct != null && (
            <div className="min-w-[min(100%,280px)] flex-1 sm:pb-0.5">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-medium text-foreground">{progressPct}%</span>
              </div>
              <div className="task-bento-progress-track">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-b transition-all",
                    overEstimate
                      ? "from-destructive to-destructive/80 shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)]"
                      : "task-bento-progress-fill"
                  )}
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Dialog open={estimateModalOpen} onOpenChange={setEstimateModalOpen}>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Estimated time</DialogTitle>
              <DialogDescription>
                Update how long you expect this task to take. Logged time is the sum of time entries below.
              </DialogDescription>
            </DialogHeader>
            <DurationPicker
              value={estimateDraft}
              onValueChange={setEstimateDraft}
              id="task-estimate-modal"
              label="How long do you expect this task to take?"
            />
            {estimateError && <p className="text-sm text-destructive">{estimateError}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEstimateModalOpen(false)}
                disabled={estimateSaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveEstimate()} disabled={estimateSaving}>
                {estimateSaving ? "Saving…" : "Save estimate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {quickAddOpen && (
          <form
            onSubmit={handleAdd}
            className="task-bento-inset space-y-3 border-0 p-4"
            aria-label="Quick log time"
          >
            <p className="text-sm font-medium">Quick entry</p>
            <div className="flex flex-wrap items-end gap-3">
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
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label htmlFor="tl-note">Note (optional)</Label>
                <Input
                  id="tl-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What was done"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </form>
        )}

        {sortedForDisplay.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time logged yet.</p>
        ) : (
          <ul className="task-bento-inset divide-y divide-border/40 overflow-hidden border-0">
            {sortedForDisplay.map((log) => {
              const label = whoLabel(log, userLabels, contactLabels);
              const key = whoKey(log);
              return (
                <li key={log.id} className="flex items-start gap-3 p-3 text-sm">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                      avatarBgClass(key)
                    )}
                    aria-hidden
                  >
                    {initialsFromLabel(label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{log.note?.trim() || "Time logged"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {label} · {formatShortMonthDay(log.log_date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMinutesAsHrsMin(log.minutes ?? 0)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(log.id)}
                      disabled={deletingId === log.id}
                      aria-label="Delete time log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
