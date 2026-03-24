"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, LayoutGrid, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, StatusOrTypeTerm, TaskTimeLog } from "@/lib/supabase/projects";
import {
  DEFAULT_TASK_PHASE_SLUG,
  DEFAULT_TASK_STATUS_SLUG,
  DEFAULT_TASK_TYPE_SLUG,
} from "@/lib/supabase/projects";
import type { CrmNote } from "@/lib/supabase/crm";
import { TaskTermSelectItems } from "@/components/tasks/TaskTermSelectItems";
import { TaskFollowersSection } from "@/components/crm/TaskFollowersSection";
import { TaskTimeLogsSection } from "@/components/crm/TaskTimeLogsSection";
import { TaskThreadSection } from "@/components/crm/TaskThreadSection";
import { TaskBentoPanelTitle } from "@/components/tasks/TaskBentoPanelTitle";
import { TaskResourcesSection } from "@/components/tasks/TaskResourcesSection";
import { ScheduleDueSubStatus } from "@/components/tasks/ScheduleDueSubStatus";
import {
  ADMIN_TASKS_LIST_PATH,
  taskDetailQuery,
  type TaskDetailFrom,
} from "@/lib/tasks/task-detail-nav";
import type { TaskFollowerWithLabel } from "@/lib/tasks/task-follower-types";
import {
  replaceTaskResourceAssignments,
  type TaskResourceAssignmentDraft,
} from "@/lib/tasks/task-resources-api";

const SELECT_TRIGGER_CLASS =
  "mt-0.5 rounded-xl border-border/60 bg-background/90 shadow-sm backdrop-blur-sm";

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = String(iso).trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

function pickSlug(
  terms: StatusOrTypeTerm[],
  current: string | null | undefined,
  fallback: string
): string {
  const cur = (current ?? "").trim().toLowerCase();
  if (cur && terms.some((t) => t.slug === cur)) return cur;
  const fb = terms.find((t) => t.slug === fallback)?.slug;
  return fb ?? terms[0]?.slug ?? "";
}

interface TaskEditClientProps {
  projectId: string;
  projectName: string;
  task: Task;
  assignees: TaskFollowerWithLabel[];
  /** Customizer-driven options (`id` === slug). */
  statusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  taskPhaseTerms: StatusOrTypeTerm[];
  taskDetailFrom: TaskDetailFrom;
  initialTimeLogs: TaskTimeLog[];
  timeLogUserLabels: Record<string, string>;
  timeLogContactLabels: Record<string, string>;
  initialNotes: CrmNote[];
  authorLabels: Record<string, string>;
}

export function TaskEditClient({
  projectId,
  projectName,
  task,
  assignees,
  statusTerms,
  taskTypeTerms,
  taskPhaseTerms,
  taskDetailFrom,
  initialTimeLogs,
  timeLogUserLabels,
  timeLogContactLabels,
  initialNotes,
  authorLabels,
}: TaskEditClientProps) {
  const router = useRouter();
  const fromQuery = taskDetailQuery(taskDetailFrom);
  const taskDetailHref = `/admin/projects/${projectId}/tasks/${task.id}${fromQuery}`;
  const backHref =
    taskDetailFrom === "project" ? `/admin/projects/${projectId}` : ADMIN_TASKS_LIST_PATH;
  const backLabel =
    taskDetailFrom === "project" ? `← Back to ${projectName}` : "← Back to all tasks";

  const defaultStatusSlug = useMemo(
    () => pickSlug(statusTerms, task.task_status_slug, DEFAULT_TASK_STATUS_SLUG),
    [statusTerms, task.task_status_slug]
  );
  const defaultTypeSlug = useMemo(
    () => pickSlug(taskTypeTerms, task.task_type_slug, DEFAULT_TASK_TYPE_SLUG),
    [taskTypeTerms, task.task_type_slug]
  );
  const defaultPhaseSlug = useMemo(
    () => pickSlug(taskPhaseTerms, task.task_phase_slug, DEFAULT_TASK_PHASE_SLUG),
    [taskPhaseTerms, task.task_phase_slug]
  );

  const [title, setTitle] = useState(task.title ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [statusSlug, setStatusSlug] = useState(defaultStatusSlug);
  const [typeSlug, setTypeSlug] = useState(defaultTypeSlug);
  const [phaseSlug, setPhaseSlug] = useState(defaultPhaseSlug);
  const [startDate, setStartDate] = useState(dateInputValue(task.start_date));
  const [dueDate, setDueDate] = useState(dateInputValue(task.due_date));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResourceAssignments, setPendingResourceAssignments] = useState<
    TaskResourceAssignmentDraft[]
  >([]);

  /** Load resource assignments into draft (applied on Save with PUT). */
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tasks/${task.id}/resources`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.resolve({})))
      .then(
        (j: {
          data?: Array<{
            resource_id?: string;
            bundle_instance_id?: string | null;
          }>;
        }) => {
          if (cancelled) return;
          const raw = j?.data;
          if (!Array.isArray(raw)) {
            setPendingResourceAssignments([]);
            return;
          }
          const rows: TaskResourceAssignmentDraft[] = raw
            .filter(
              (x): x is { resource_id: string; bundle_instance_id?: string | null } =>
                x != null &&
                typeof x === "object" &&
                typeof (x as { resource_id?: string }).resource_id === "string"
            )
            .map((x) => ({
              resource_id: String(x.resource_id).trim(),
              bundle_instance_id:
                typeof x.bundle_instance_id === "string" && x.bundle_instance_id.trim()
                  ? x.bundle_instance_id.trim()
                  : null,
            }));
          setPendingResourceAssignments(rows);
        }
      )
      .catch(() => {
        if (!cancelled) setPendingResourceAssignments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    const phase = phaseSlug || defaultPhaseSlug;
    if (taskPhaseTerms.length > 0 && !phase) {
      setError("Select a task phase.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          task_status_slug: statusSlug || defaultStatusSlug,
          task_type_slug: typeSlug || defaultTypeSlug,
          task_phase_slug: phase || defaultPhaseSlug,
          start_date: startDate || null,
          due_date: dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to update task");
        return;
      }
      try {
        await replaceTaskResourceAssignments(task.id, pendingResourceAssignments);
      } catch (resErr) {
        setError(
          resErr instanceof Error
            ? resErr.message
            : "Task saved but resource assignments failed. Try saving again."
        );
        return;
      }
      router.push(taskDetailHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="task-bento-page mx-auto max-w-7xl space-y-3 pb-6 md:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit task</h1>
          <Link
            href={backHref}
            className="mt-1 inline-block text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {backLabel}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            form="task-edit-form"
            size="sm"
            disabled={submitting}
            className="task-bento-primary-btn shrink-0 rounded-xl border border-white/60 bg-primary/95 backdrop-blur-sm transition-[box-shadow,transform] hover:bg-primary active:scale-[0.98]"
          >
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 rounded-xl border-border/60 bg-background/80 shadow-sm backdrop-blur-sm"
            asChild
          >
            <Link href={taskDetailHref}>Cancel</Link>
          </Button>
        </div>
      </div>

      <form id="task-edit-form" onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        <section className="task-bento-hero border-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="task-bento-chip shrink-0" title="Task reference (cannot be changed)">
              {task.task_number}
            </div>
            <Input
              id="task-edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              aria-label="Task title"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xl font-semibold leading-tight tracking-tight text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-2xl"
            />
          </div>
          <div className="mt-2">
            <Label htmlFor="task-edit-description" className="sr-only">
              Description
            </Label>
            <Textarea
              id="task-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="min-h-[3.75rem] resize-y rounded-xl border-border/50 bg-background/40 text-sm leading-snug text-foreground placeholder:text-muted-foreground/60 shadow-sm backdrop-blur-sm focus-visible:ring-1"
            />
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </section>

        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4 lg:grid-rows-1">
          <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
            <CardHeader className="task-bento-card-header">
              <TaskBentoPanelTitle icon={LayoutGrid}>Phase &amp; Type</TaskBentoPanelTitle>
            </CardHeader>
            <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-2">
              <div>
                <Label htmlFor="task_phase" className="text-xs text-muted-foreground">
                  Phase
                </Label>
                <Select
                  value={phaseSlug}
                  onValueChange={setPhaseSlug}
                  disabled={taskPhaseTerms.length === 0}
                >
                  <SelectTrigger id="task_phase" className={SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder={taskPhaseTerms.length === 0 ? "No phases" : "Phase"} />
                  </SelectTrigger>
                  <SelectContent>
                    <TaskTermSelectItems terms={taskPhaseTerms} />
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task_type" className="text-xs text-muted-foreground">
                  Type
                </Label>
                <Select value={typeSlug} onValueChange={setTypeSlug}>
                  <SelectTrigger id="task_type" className={SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <TaskTermSelectItems terms={taskTypeTerms} />
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
            <CardHeader className="task-bento-card-header">
              <TaskBentoPanelTitle icon={Calendar}>Schedule and Status</TaskBentoPanelTitle>
            </CardHeader>
            <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-2 text-sm">
              <div>
                <Label htmlFor="start_date" className="text-xs text-muted-foreground">
                  Start
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-0.5 w-full max-w-[11rem] rounded-xl border-border/60 bg-background/90 font-mono text-sm font-medium tabular-nums shadow-sm backdrop-blur-sm"
                />
              </div>
              <div>
                <Label htmlFor="due" className="text-xs text-muted-foreground">
                  Due
                </Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-0.5 w-full max-w-[11rem] rounded-xl border-border/60 bg-background/90 font-mono text-sm font-medium tabular-nums shadow-sm backdrop-blur-sm"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-xs text-muted-foreground">
                  Status
                </Label>
                <Select value={statusSlug} onValueChange={setStatusSlug}>
                  <SelectTrigger id="status" className={SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <TaskTermSelectItems terms={statusTerms} />
                  </SelectContent>
                </Select>
                <ScheduleDueSubStatus dueDate={dueDate || null} />
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 h-full">
            <TaskFollowersSection
              taskId={task.id}
              initialFollowers={assignees}
              projectId={projectId}
            />
          </div>

          <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
            <CardHeader className="task-bento-card-header">
              <TaskBentoPanelTitle icon={Paperclip}>Assigned resources</TaskBentoPanelTitle>
            </CardHeader>
            <CardContent className="task-bento-card-content flex flex-1 flex-col">
              <TaskResourcesSection
                taskId={task.id}
                projectId={projectId}
                canManage
                pendingResourceAssignments={pendingResourceAssignments}
                onPendingResourceAssignmentsChange={setPendingResourceAssignments}
              />
            </CardContent>
          </Card>
        </div>
      </form>

      <TaskTimeLogsSection
        taskId={task.id}
        initialLogs={initialTimeLogs}
        userLabels={timeLogUserLabels}
        contactLabels={timeLogContactLabels}
        taskStatusSlug={statusSlug}
        onTaskStatusSlugChange={setStatusSlug}
        estimatedMinutes={task.proposed_time}
        canEditEstimate
      />

      <TaskThreadSection taskId={task.id} initialNotes={initialNotes} authorLabels={authorLabels} />
    </div>
  );
}
