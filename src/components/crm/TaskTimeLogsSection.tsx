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
  /** Planned minutes (task planned/proposed time) for progress bar; omit when unknown */
  plannedMinutes?: number | null;
  /** When true, show a button + modal to update planned time (task edit). Detail view: false. */
  canEditPlanned?: boolean;
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
function effectivePlannedMinutes(raw: number | null | undefined): number | null {
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
  plannedMinutes,
  canEditPlanned = false,
}: TaskTimeLogsSectionProps) {
  const [logs, setLogs] = useState<TaskTimeLog[]>(initialLogs);
  const [planned, setPlanned] = useState<number | null>(() => effectivePlannedMinutes(plannedMinutes ?? null));

  const [logDate, setLogDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const [plannedModalOpen, setPlannedModalOpen] = useState(false);
  const [plannedDraft, setPlannedDraft] = useState<number | null>(null);
  const [plannedSaving, setPlannedSaving] = useState(false);
  const [plannedError, setPlannedError] = useState<string | null>(null);

  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    setPlanned(effectivePlannedMinutes(plannedMinutes ?? null));
  }, [plannedMinutes]);

  const totalMinutes = logs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const plannedForBar = planned;
  const hasPlannedTime = plannedForBar != null && plannedForBar > 0;
  const markCompleteChecked = isTaskStatusCompletedSlug(taskStatusSlug);
  /** Logged minutes strictly over planned (used for over-budget styling). */
  const loggedOverPlanned = hasPlannedTime && totalMinutes > plannedForBar;
  /** Uncapped vs planned (All Tasks list); complete + under/at budget shows 100% in UI, not raw. */
  const rawProgressPct = hasPlannedTime
    ? Math.round((totalMinutes / plannedForBar) * 100)
    : 0;
  const barWidthPct = markCompleteChecked ? 100 : hasPlannedTime ? Math.min(100, rawProgressPct) : 100;

  const progressLabelText = !hasPlannedTime
    ? markCompleteChecked
      ? "Complete"
      : "No planned time"
    : markCompleteChecked && !loggedOverPlanned
      ? "100%"
      : `${rawProgressPct}%`;

  const progressLabelClass = !hasPlannedTime
    ? "text-foreground"
    : markCompleteChecked
      ? loggedOverPlanned
        ? "text-red-600 dark:text-red-500"
        : "text-green-600 dark:text-green-500"
      : rawProgressPct > 100
        ? "text-red-600 dark:text-red-500"
        : "text-green-600 dark:text-green-500";

  const progressBarFillClass =
    !hasPlannedTime && !markCompleteChecked
      ? "bg-muted-foreground/30"
      : loggedOverPlanned
        ? "bg-gradient-to-b from-destructive to-destructive/80 shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.35)]"
        : "task-bento-progress-fill";

  const openPlannedModal = () => {
    setPlannedError(null);
    setPlannedDraft(planned ?? null);
    setPlannedModalOpen(true);
  };

  const savePlanned = async () => {
    setPlannedError(null);
    setPlannedSaving(true);
    try {
      const planned_time = plannedDraft != null && plannedDraft > 0 ? plannedDraft : null;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planned_time }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlannedError(typeof data?.error === "string" ? data.error : "Failed to save planned time");
        return;
      }
      setPlanned(effectivePlannedMinutes(planned_time ?? undefined));
      setPlannedModalOpen(false);
      router.refresh();
    } catch (e) {
      setPlannedError(e instanceof Error ? e.message : "Failed to save planned time");
    } finally {
      setPlannedSaving(false);
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

  const plannedDisplay =
    planned != null ? formatMinutesAsHrsMin(planned) : null;

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
      <CardHeader className="task-bento-card-header">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
      <CardContent className="task-bento-card-content space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[9rem] space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Planned</p>
            {canEditPlanned ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full max-w-[220px] justify-center rounded-xl border-border/60 bg-background/90 px-4 py-2 text-left font-semibold tabular-nums shadow-sm backdrop-blur-sm sm:w-auto"
                onClick={openPlannedModal}
              >
                {plannedDisplay ?? "Set planned time"}
              </Button>
            ) : (
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {plannedDisplay ?? "—"}
              </p>
            )}
          </div>
          <div className="min-w-[9rem] space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Logged</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {formatMinutesAsHrsMin(totalMinutes)}
            </p>
          </div>
          <div className="min-w-[min(100%,280px)] flex-1 sm:pb-0.5">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className={cn("font-medium", progressLabelClass)}>{progressLabelText}</span>
            </div>
            <div className="task-bento-progress-track">
              <div
                className={cn("h-full rounded-full transition-all", progressBarFillClass)}
                style={{ width: `${barWidthPct}%` }}
              />
            </div>
          </div>
        </div>

        <Dialog open={plannedModalOpen} onOpenChange={setPlannedModalOpen}>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Planned time</DialogTitle>
              <DialogDescription>
                Update planned time for this task. Logged time is the sum of time entries below.
              </DialogDescription>
            </DialogHeader>
            <DurationPicker
              value={plannedDraft}
              onValueChange={setPlannedDraft}
              id="task-estimate-modal"
              label="How long is planned for this task?"
            />
            {plannedError && <p className="text-sm text-destructive">{plannedError}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlannedModalOpen(false)}
                disabled={plannedSaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void savePlanned()} disabled={plannedSaving}>
                {plannedSaving ? "Saving…" : "Save planned time"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {quickAddOpen && (
          <form
            onSubmit={handleAdd}
            className="task-bento-inset space-y-2 border-0 p-3"
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
                <li key={log.id} className="flex items-start gap-2 p-2 text-sm">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
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
