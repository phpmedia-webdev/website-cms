"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskListItem = {
  id: string;
  title: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardQuickLinks() {
  const router = useRouter();
  const [timeOpen, setTimeOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);

  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [timeSubmitting, setTimeSubmitting] = useState(false);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickMinutes, setQuickMinutes] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    if (!q) return tasks.slice(0, 50);
    return tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 50);
  }, [taskSearch, tasks]);
  const selectedTaskLabel = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId)?.title ?? "",
    [tasks, selectedTaskId]
  );
  const taskPickerRef = useRef<HTMLDivElement>(null);

  const loadActiveTasks = async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const res = await fetch("/api/tasks?exclude_status_slugs=completed");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTasksError(typeof data?.error === "string" ? data.error : "Failed to load tasks");
        return;
      }
      const rows = Array.isArray(data?.tasks) ? data.tasks : [];
      const nextTasks: TaskListItem[] = rows
        .filter((t: Record<string, unknown>) => typeof t?.id === "string" && typeof t?.title === "string")
        .map((t: Record<string, unknown>) => ({ id: String(t.id), title: String(t.title) }));
      setTasks(nextTasks);
    } catch (e) {
      setTasksError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  };

  const openTimeModal = async () => {
    setTimeOpen(true);
    setTaskSearch("");
    setTaskPickerOpen(false);
    setSelectedTaskId("");
    setTimeMinutes("");
    setTimeNote("");
    await loadActiveTasks();
  };

  const submitQuickTime = async () => {
    const mins = Number.parseInt(timeMinutes, 10);
    if (!selectedTaskId || !Number.isInteger(mins) || mins < 0) return;
    setTimeSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_date: todayIsoDate(),
          minutes: mins,
          note: timeNote.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to add time");
      }
      setTimeOpen(false);
      router.refresh();
    } catch (e) {
      setTasksError(e instanceof Error ? e.message : "Failed to add time");
    } finally {
      setTimeSubmitting(false);
    }
  };

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskPickerOpen(false);
    setTaskSearch("");
  };

  const submitQuickTask = async () => {
    setQuickError(null);
    const title = quickTitle.trim();
    const mins = quickMinutes.trim() ? Number.parseInt(quickMinutes, 10) : 0;
    if (!title) {
      setQuickError("Task title is required.");
      return;
    }
    if (!Number.isInteger(mins) || mins < 0) {
      setQuickError("Minutes must be a non-negative integer.");
      return;
    }
    setQuickSubmitting(true);
    try {
      const createRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: quickDescription.trim() || null,
          project_id: null,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || typeof createData?.id !== "string") {
        throw new Error(typeof createData?.error === "string" ? createData.error : "Failed to create task");
      }
      if (mins > 0) {
        const logRes = await fetch(`/api/tasks/${createData.id}/time-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            log_date: todayIsoDate(),
            minutes: mins,
            note: "Quick task initial time",
          }),
        });
        if (!logRes.ok) {
          const logData = await logRes.json().catch(() => ({}));
          throw new Error(typeof logData?.error === "string" ? logData.error : "Task created but time log failed");
        }
      }
      setQuickTaskOpen(false);
      setQuickTitle("");
      setQuickDescription("");
      setQuickMinutes("");
      router.push(`/admin/projects/tasks/${createData.id}`);
      router.refresh();
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : "Failed to create quick task");
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild className="bg-red-600 text-white hover:bg-red-700">
          <Link href="/admin/ecommerce/transactions">+Expense</Link>
        </Button>
        <Button asChild className="bg-green-600 text-white hover:bg-green-700">
          <Link href="/admin/ecommerce/transactions">+Payment</Link>
        </Button>
        <Button type="button" onClick={() => void openTimeModal()} className="bg-blue-600 text-white hover:bg-blue-700">
          +Time
        </Button>
        <Button type="button" onClick={() => setQuickTaskOpen(true)} className="bg-orange-500 text-white hover:bg-orange-600">
          +Task
        </Button>
      </div>

      <Dialog open={timeOpen} onOpenChange={setTimeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add time to active task</DialogTitle>
            <DialogDescription>Search active tasks and log time quickly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dashboard-time-task-picker">Task</Label>
              <div ref={taskPickerRef} className="relative">
                <Button
                  id="dashboard-time-task-picker"
                  type="button"
                  variant="outline"
                  disabled={tasksLoading || timeSubmitting}
                  className={cn(
                    "h-9 w-full justify-between px-3 font-normal",
                    !selectedTaskId && "text-muted-foreground"
                  )}
                  onClick={() => setTaskPickerOpen((open) => !open)}
                  aria-expanded={taskPickerOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate text-left">
                    {tasksLoading
                      ? "Loading tasks..."
                      : selectedTaskId
                        ? selectedTaskLabel || "Selected task"
                        : "Select active task"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
                </Button>
                {taskPickerOpen && !tasksLoading && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
                    <div className="border-b p-2">
                      <Input
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        placeholder="Type to filter tasks..."
                        className="h-8"
                        autoFocus
                        aria-label="Filter tasks"
                      />
                    </div>
                    <ul className="max-h-52 overflow-auto p-1" role="listbox">
                      {filteredTasks.length === 0 ? (
                        <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                          No matching active tasks
                        </li>
                      ) : (
                        filteredTasks.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              role="option"
                              className={cn(
                                "flex w-full min-w-0 items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                                selectedTaskId === t.id && "bg-accent"
                              )}
                              onClick={() => selectTask(t.id)}
                            >
                              {selectedTaskId === t.id ? (
                                <Check className="mr-2 h-4 w-4 shrink-0" />
                              ) : (
                                <span className="mr-2 w-4 shrink-0" />
                              )}
                              <span className="truncate">{t.title}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dashboard-time-minutes">Minutes</Label>
                <Input
                  id="dashboard-time-minutes"
                  type="number"
                  min={0}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(e.target.value)}
                  placeholder="0"
                  disabled={timeSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dashboard-time-note">Note (optional)</Label>
                <Input
                  id="dashboard-time-note"
                  value={timeNote}
                  onChange={(e) => setTimeNote(e.target.value)}
                  placeholder="What was done"
                  disabled={timeSubmitting}
                />
              </div>
            </div>
            {tasksError ? <p className="text-sm text-destructive">{tasksError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTimeOpen(false)} disabled={timeSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitQuickTime()} disabled={timeSubmitting}>
              {timeSubmitting ? "Saving..." : "Save time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickTaskOpen} onOpenChange={setQuickTaskOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create quick task</DialogTitle>
            <DialogDescription>Create a standalone task; entered time is logged immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dashboard-quick-task-title">Title</Label>
              <Input
                id="dashboard-quick-task-title"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Task title"
                disabled={quickSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dashboard-quick-task-description">Description (optional)</Label>
              <Input
                id="dashboard-quick-task-description"
                value={quickDescription}
                onChange={(e) => setQuickDescription(e.target.value)}
                placeholder="Optional description"
                disabled={quickSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dashboard-quick-task-minutes">Initial time (minutes)</Label>
              <Input
                id="dashboard-quick-task-minutes"
                type="number"
                min={0}
                value={quickMinutes}
                onChange={(e) => setQuickMinutes(e.target.value)}
                placeholder="0"
                disabled={quickSubmitting}
              />
            </div>
            {quickError ? <p className="text-sm text-destructive">{quickError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQuickTaskOpen(false)} disabled={quickSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitQuickTask()} disabled={quickSubmitting}>
              {quickSubmitting ? "Creating..." : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

