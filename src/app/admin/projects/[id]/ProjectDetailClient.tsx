"use client";

import { useState, useEffect, useMemo, type ElementType } from "react";
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Pencil,
  Archive,
  ArchiveRestore,
  Banknote,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDollarSign,
  Clock,
  Hash,
  ImageIcon,
  MessageSquare,
  Package,
  Paperclip,
  Percent,
  Receipt,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { Event } from "@/lib/supabase/events";
import { sumProjectEventsEstimatedMinutes } from "@/lib/events/project-event-time-estimate";
import type { Project, Task, ProjectMember } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { formatMinutesAsHoursMinutes, projectDisplayRef } from "@/lib/supabase/projects";
import type { OrderRow } from "@/lib/shop/orders";
import type { InvoiceRow } from "@/lib/shop/invoices";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import { resolveTaskCustomizerTerm } from "@/lib/tasks/customizer-task-terms";
import { isTaskStatusCompletedSlug } from "@/lib/tasks/task-status-reserved";
import { cn } from "@/lib/utils";

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

/**
 * Project task list — Due column (local calendar):
 * - Completed → muted (never show overdue red).
 * - Not completed, invalid/missing due → muted.
 * - Not completed, today > due day → red (overdue).
 * - Not completed, due today or later → green.
 */
function dueDateProjectListTone(
  isoDue: string | null | undefined,
  taskStatusSlug: string | null | undefined
): "muted" | "overdue" | "ok" {
  if (isTaskStatusCompletedSlug(taskStatusSlug)) return "muted";
  const raw = typeof isoDue === "string" ? isoDue.trim() : "";
  if (!raw) return "muted";
  const ymd = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const parts = ymd.split("-").map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return "muted";
  const [y, m, d] = parts;
  const dueDay = new Date(y!, m! - 1, d!);
  if (Number.isNaN(dueDay.getTime())) return "muted";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  dueDay.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (dueDay.getTime() < today.getTime()) return "overdue";
  return "ok";
}

/**
 * Progress % = sum(`task_time_logs.minutes`) / `planned_time` × 100 (same as All Tasks list).
 * Null when planned is missing or zero.
 */
function taskTimeProgressPercentFromLogs(task: Task, loggedMinutes: number): number | null {
  const planned = task.planned_time;
  if (planned == null || planned <= 0) return null;
  const spent = Math.max(0, loggedMinutes);
  return Math.round((spent / planned) * 100);
}

/** Whole minutes → HH:MM (hours and minutes zero-padded, min 2 hour digits). */
function formatMinutesAsHhMm(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Planned / logged time row: `09:30 - Tasks` (matches metric typography). */
function MetricTimeHhMmDashRow({ minutes, suffix }: { minutes: number; suffix: string }) {
  return (
    <p className="text-base font-semibold leading-tight text-foreground tabular-nums">
      <span>{formatMinutesAsHhMm(minutes)}</span>
      <span className="ml-1 text-xs font-normal normal-case tracking-normal text-muted-foreground">
        {" "}- {suffix}
      </span>
    </p>
  );
}

/** $1,234.56 style (no spurious leading zeros on the integer part). */
function formatUsdAccounting(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Event has fully ended (end before now). */
function isEventPast(ev: Event): boolean {
  try {
    return new Date(ev.end_date).getTime() < Date.now();
  } catch {
    return false;
  }
}

interface ProjectDetailClientProps {
  project: Project;
  /** Resolved cover image URL when `project.cover_image_id` is set. */
  coverImageUrl: string | null;
  initialTasks: Task[];
  initialOrders: OrderRow[];
  initialInvoices: InvoiceRow[];
  projectTotal: number;
  /** Total planned minutes across related tasks (Option A rollup). */
  projectPlannedTimeMinutes: number;
  /** Total minutes logged across all tasks in this project (time logs). */
  projectTimeLogMinutes: number;
  /** Resolved client label when project has contact_id or client_organization_id. */
  clientDisplayName: string | null;
  projectStatusTerms: StatusOrTypeTerm[];
  projectTypeTerms: StatusOrTypeTerm[];
  taskStatusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  /** Per-task logged minutes (from `task_time_logs`); keys = task id. */
  initialTaskTimeLogTotals: Record<string, number>;
  initialProjectEvents: Event[];
  initialProjectMembers: (ProjectMember & { label: string; role_label: string | null })[];
  projectRoleTerms: StatusOrTypeTerm[];
}

type TabId =
  | "message-center"
  | "tasks"
  | "events"
  | "transactions"
  | "attachments"
  | "deliverables";

/** Shared minimum height for client/team, date/progress stats (aligned to planned-time band ~5.5–6rem). */
const METRIC_ROW_MIN_H = "min-h-[5.5rem]";

function OverviewStatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border border-border/80 bg-muted/30 p-3",
        METRIC_ROW_MIN_H
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-semibold leading-tight text-foreground">{value}</p>
      {sub ? <p className="text-[11px] leading-snug text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ProjectDetailClient({
  project,
  coverImageUrl,
  initialTasks,
  initialOrders,
  initialInvoices,
  projectTotal,
  projectPlannedTimeMinutes,
  projectTimeLogMinutes,
  clientDisplayName,
  projectStatusTerms,
  projectTypeTerms,
  taskStatusTerms,
  taskTypeTerms,
  initialTaskTimeLogTotals,
  initialProjectEvents,
  initialProjectMembers,
  projectRoleTerms: _projectRoleTerms,
}: ProjectDetailClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [taskTimeLogTotals, setTaskTimeLogTotals] =
    useState<Record<string, number>>(initialTaskTimeLogTotals);
  const [orders, setOrders] = useState(initialOrders);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [projectEvents, setProjectEvents] = useState(initialProjectEvents);
  const [projectMembers, setProjectMembers] = useState(initialProjectMembers);

  const sortedProjectEvents = useMemo(
    () =>
      [...projectEvents].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ),
    [projectEvents]
  );
  const projectEventTimeEstimateMinutes = useMemo(
    () => sumProjectEventsEstimatedMinutes(projectEvents),
    [projectEvents]
  );
  const [tab, setTab] = useState<TabId>("message-center");
  const [archivedAt, setArchivedAt] = useState(project.archived_at);
  const [busy, setBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const router = useRouter();
  const isArchived = !!archivedAt;

  useEffect(() => {
    setProjectMembers(initialProjectMembers);
  }, [initialProjectMembers]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setTaskTimeLogTotals(initialTaskTimeLogTotals);
  }, [initialTaskTimeLogTotals]);

  function initials(label: string): string {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    }
    return label.slice(0, 2).toUpperCase() || "?";
  }

  const toggleArchive = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archived_at: isArchived ? null : new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setArchivedAt(isArchived ? null : new Date().toISOString());
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const mergedTransactions = [
    ...orders.map((o) => ({ type: "order" as const, at: o.created_at, id: o.id, number: o.order_number ?? o.id.slice(0, 8), total: o.total, status: o.status, currency: o.currency })),
    ...invoices.map((i) => ({ type: "invoice" as const, at: i.created_at, id: i.id, number: i.invoice_number ?? i.id.slice(0, 8), total: i.total, status: i.status, currency: i.currency })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const unlinkOrder = async (orderId: string) => {
    const res = await fetch(`/api/ecommerce/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: null }),
    });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      router.refresh();
    }
  };

  const unlinkInvoice = async (invoiceId: string) => {
    const res = await fetch(`/api/ecommerce/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: null }),
    });
    if (res.ok) {
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
      router.refresh();
    }
  };

  const unlinkEvent = async (eventId: string) => {
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: null }),
    });
    if (res.ok) {
      setProjectEvents((prev) => prev.filter((e) => e.id !== eventId));
      router.refresh();
    }
  };

  const typeTerm =
    project.project_type_slug != null
      ? projectTypeTerms.find((t) => t.slug === project.project_type_slug) ?? null
      : null;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => isTaskStatusCompletedSlug(t.task_status_slug)).length;
  const taskProgressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const primaryContactId = project.contact_id;
  const teamOnlyMembers =
    primaryContactId != null
      ? projectMembers.filter((m) => m.contact_id !== primaryContactId)
      : projectMembers;

  const estimatedMinutes = projectPlannedTimeMinutes;
  const hasBudget = estimatedMinutes != null && estimatedMinutes > 0;

  // MOCK — wire to Accounting (payments, expenses, margin) later
  const mockProfitabilityIncome = 12500;
  const mockProfitabilityExpense = 7800;
  const mockProfitabilityMarginPct =
    mockProfitabilityIncome > 0
      ? Math.round(
          ((mockProfitabilityIncome - mockProfitabilityExpense) / mockProfitabilityIncome) * 100
        )
      : 0;
  const hourlyRate = project.estimated_hourly_rate;
  const laborEstimateUsd =
    hourlyRate != null && hourlyRate > 0 ? (projectTimeLogMinutes / 60) * hourlyRate : null;
  const linkedTaskCount = tasks.length;

  const deleteProjectWithMode = async (deleteLinkedTasks: boolean) => {
    if (deleteLinkedTasks) {
      const confirmed = window.confirm(
        `Final warning: this will permanently delete this project and ${linkedTaskCount} linked task${linkedTaskCount === 1 ? "" : "s"}. This cannot be undone. Continue?`
      );
      if (!confirmed) return;
    }
    setDeleteBusy(true);
    try {
      const q = deleteLinkedTasks ? "?delete_tasks=1" : "";
      const res = await fetch(`/api/projects/${project.id}${q}`, { method: "DELETE" });
      if (!res.ok) return;
      setDeleteDialogOpen(false);
      router.push("/admin/projects");
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page chrome — match task detail (`tasks/[taskId]/page.tsx`): outside overview card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project Detail</h1>
          <Link
            href="/admin/projects"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back to all projects
          </Link>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleArchive} disabled={busy}>
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-1" aria-hidden />
                Restore
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-1" aria-hidden />
                Archive
              </>
            )}
          </Button>
          <Button size="sm" className="shrink-0" asChild>
            <Link href={`/admin/projects/${project.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" aria-hidden />
              Edit
            </Link>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="shrink-0"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              Deletion is intended for test or sandbox projects. For real projects, use Archive so
              records stay intact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              This project currently has{" "}
              <span className="font-medium text-foreground">{linkedTaskCount}</span> linked task
              {linkedTaskCount === 1 ? "" : "s"}.
            </p>
            <p>
              You can delete the project only (recommended), which preserves linked tasks and
              unlinks them to <span className="font-medium text-foreground">No project</span>.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteProjectWithMode(false)}
              disabled={deleteBusy}
            >
              Delete project only
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteProjectWithMode(true)}
              disabled={deleteBusy}
            >
              Delete project + linked tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overview: 50% project copy | 25% image placeholder | 25% status */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-4">
          <div className="min-w-0 lg:col-span-6 flex flex-col gap-3">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Project ID
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
                  <Hash className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate" title={projectDisplayRef(project)}>
                    {projectDisplayRef(project)}
                  </span>
                </span>
                {isArchived ? (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Archived
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight text-foreground">
                {project.name}
              </h1>
              <div className="mt-2 min-h-[calc(theme(fontSize.sm)*theme(lineHeight.relaxed)*3)]">
                {project.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No description yet.</p>
                )}
              </div>
            </div>
          </div>

          <Card variant="bento" className="task-bento-tile flex min-h-0 flex-col lg:col-span-3">
            <CardContent className="flex flex-1 flex-col p-3 sm:p-4">
              <div
                className={cn(
                  "flex min-h-[8rem] flex-1 flex-col overflow-hidden rounded-xl border bg-muted/20",
                  coverImageUrl
                    ? "border-border/80 p-0"
                    : "items-center justify-center border-dashed border-border/70 px-3 py-6 text-center"
                )}
              >
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external/supabase URL
                  <img
                    src={coverImageUrl}
                    alt=""
                    className="h-full max-h-[min(16rem,40vh)] w-full flex-1 object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
                    <p className="text-xs text-muted-foreground">Optional project image</p>
                    <p className="mt-1 text-[0.6875rem] text-muted-foreground/80">Not configured</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card variant="bento" className="task-bento-tile flex min-h-0 flex-col lg:col-span-3">
            <CardContent className="flex flex-1 flex-col gap-0 px-3 pb-3 pt-3.5 sm:px-3.5 sm:pb-3 sm:pt-4">
              <div className="space-y-2.5">
                <p className="pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </p>
                <TermBadge
                  term={projectStatusTerms.find((t) => t.slug === project.project_status_slug)}
                  className="w-fit text-base px-4 py-2 font-semibold leading-none"
                />
              </div>
              <div
                className="my-3 shrink-0 border-t border-border/60"
                role="separator"
                aria-hidden
              />
              <div className="space-y-2.5">
                <p className="pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Project type
                </p>
                <TermBadge
                  term={typeTerm}
                  className="w-fit text-base px-4 py-2 font-semibold leading-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-4">
          <Card variant="bento" className="task-bento-tile flex min-h-0 flex-col lg:col-span-12">
            <CardContent className="flex flex-col p-2.5 sm:p-3">
              <div
                className={cn(
                  "grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-12 lg:gap-x-0 lg:gap-y-2",
                  METRIC_ROW_MIN_H
                )}
              >
                <p className="pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:col-span-3 lg:pr-4">
                  Client
                </p>
                <p className="pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:col-span-9 lg:border-l lg:border-border/60 lg:pl-4">
                  Team
                </p>
                <div className="flex min-w-0 flex-col lg:col-span-3 lg:pr-4">
                  <div className="mt-0.5 flex min-w-0 max-w-full flex-col items-center gap-1 sm:max-w-[10rem] sm:items-start">
                    {clientDisplayName ? (
                      <>
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
                          title={clientDisplayName}
                        >
                          {initials(clientDisplayName)}
                        </span>
                        <p
                          className="w-full min-w-0 max-w-full truncate text-center text-[10px] font-semibold leading-tight text-foreground sm:text-left"
                          title={clientDisplayName}
                        >
                          {clientDisplayName}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[10px] font-medium text-muted-foreground">
                          —
                        </span>
                        <p className="w-full truncate text-center text-[10px] text-muted-foreground sm:text-left">
                          <Link
                            href={`/admin/projects/${project.id}/edit`}
                            className="underline-offset-4 hover:underline"
                          >
                            Assign client
                          </Link>
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-col border-t border-border/60 pt-2 lg:col-span-9 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  <div className="mt-0.5 flex min-h-0 min-w-0 flex-wrap justify-start gap-x-3 gap-y-2">
                    {teamOnlyMembers.length === 0 ? (
                      <span className="min-w-0 text-left text-xs text-muted-foreground">
                        {primaryContactId
                          ? "No additional team members yet."
                          : "No members yet."}
                      </span>
                    ) : (
                      teamOnlyMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex w-[4.25rem] min-w-0 shrink-0 flex-col items-center gap-0.5 sm:w-[5rem]"
                        >
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary"
                            title={m.label}
                          >
                            {initials(m.label)}
                          </span>
                          <span
                            className="w-full min-w-0 truncate text-center text-[10px] font-semibold leading-tight text-foreground"
                            title={m.label}
                          >
                            {m.label}
                          </span>
                          {m.role_label ? (
                            <span
                              className="w-full min-w-0 truncate text-center text-[9px] leading-none text-muted-foreground"
                              title={m.role_label}
                            >
                              {m.role_label}
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
          <OverviewStatCard
            icon={Calendar}
            label="Start date"
            value={formatDate(project.start_date)}
          />
          <OverviewStatCard
            icon={Calendar}
            label="Due date"
            value={formatDate(project.due_date)}
            sub={project.end_date_extended ? "Due date extended" : undefined}
          />
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border border-border/80 bg-muted/30 p-3",
              METRIC_ROW_MIN_H
            )}
            aria-label="Task completion progress"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Progress</span>
            </div>
            {totalTasks > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] leading-snug text-muted-foreground">
                    {doneTasks} of {totalTasks} tasks
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {taskProgressPct}%
                  </span>
                </div>
                <div className="task-bento-progress-track !h-2">
                  <div
                    className={cn("task-bento-progress-fill h-full rounded-full transition-all")}
                    style={{ width: `${taskProgressPct}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold leading-tight text-foreground">—</p>
                <p className="text-[11px] leading-snug text-muted-foreground">No tasks yet</p>
              </>
            )}
          </div>
          <OverviewStatCard
            icon={Calendar}
            label="Completed"
            value={formatDate(project.completed_date)}
          />
        </div>

        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2 lg:gap-4">
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
            <div className="grid grid-cols-1 gap-3 border-border/60 sm:grid-cols-3 sm:gap-3 sm:divide-x sm:divide-border/60">
              <div className="flex min-w-0 flex-col gap-1 sm:pr-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">Planned time</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <MetricTimeHhMmDashRow minutes={projectPlannedTimeMinutes} suffix="Tasks" />
                  <MetricTimeHhMmDashRow minutes={projectEventTimeEstimateMinutes} suffix="Events" />
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:px-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">Logged time</span>
                </div>
                <MetricTimeHhMmDashRow minutes={projectTimeLogMinutes} suffix="Tasks" />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {hasBudget
                    ? `of ${formatMinutesAsHoursMinutes(estimatedMinutes)} planned`
                    : "No plan set"}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:pl-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Banknote className="size-3.5 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">Labor estimate</span>
                </div>
                <p className="text-base font-semibold leading-tight text-foreground tabular-nums">
                  {laborEstimateUsd != null ? formatUsdAccounting(laborEstimateUsd) : "—"}
                </p>
                {hourlyRate != null && hourlyRate > 0 ? (
                  <p className="truncate text-[10px] leading-tight text-muted-foreground">
                    Based on hourly rate of {formatUsdAccounting(hourlyRate)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
              <CircleDollarSign className="size-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Profitability</span>
              <span className="text-[10px] font-normal normal-case text-muted-foreground/80">(mock)</span>
            </div>
            <div className="grid grid-cols-1 gap-3 border-border/60 sm:grid-cols-3 sm:gap-3 sm:divide-x sm:divide-border/60">
              <div className="flex min-w-0 flex-col gap-0.5 sm:pr-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="size-3.5 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">Income</span>
                </div>
                <p className="text-base font-semibold leading-none text-foreground tabular-nums">
                  {formatUsdAccounting(mockProfitabilityIncome)}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 sm:px-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Receipt className="size-3.5 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">Expense</span>
                </div>
                <p className="text-base font-semibold leading-none text-foreground tabular-nums">
                  {formatUsdAccounting(mockProfitabilityExpense)}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 sm:pl-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Percent className="size-3.5 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">Margin</span>
                </div>
                <p className="text-base font-semibold leading-none text-foreground tabular-nums">
                  {mockProfitabilityMarginPct}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project workspace tabs */}
      <Card className="overflow-hidden shadow-sm">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-full">
          <TabsList
            className="flex h-auto w-full flex-wrap justify-start gap-0 rounded-none border-b border-border bg-transparent p-0"
            aria-label="Project sections"
          >
            <TabsTrigger
              value="message-center"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-5"
            >
              <MessageSquare className="size-4 shrink-0" />
              Message Center
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-5"
            >
              <CheckSquare className="size-4 shrink-0" />
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-5"
            >
              <CalendarDays className="size-4 shrink-0" />
              Events
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-5"
            >
              <Receipt className="size-4 shrink-0" />
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="attachments"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-5"
            >
              <Paperclip className="size-4 shrink-0" />
              Attachments
            </TabsTrigger>
            <TabsTrigger
              value="deliverables"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-5"
            >
              <Package className="size-4 shrink-0" />
              Deliverables
            </TabsTrigger>
          </TabsList>

          <CardContent className="p-4 sm:p-6">
            <TabsContent value="message-center" className="mt-0 outline-none">
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
                <MessageSquare className="size-10 text-muted-foreground/50" aria-hidden />
                <h3 className="text-base font-medium">Message Center</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Project messages and notifications will appear here. Wiring is planned in a
                  follow-up pass.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0 outline-none">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Tasks</h2>
                <Button size="sm" asChild>
                  <Link href={`/admin/projects/${project.id}/tasks/new`}>Add task</Link>
                </Button>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full table-fixed caption-bottom text-sm">
                  {/* Column %: 13+30+13+10+10+10+15 — table-fixed UAs scale to table width */}
                  <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">
                        Task ID
                      </th>
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">
                        Title
                      </th>
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">
                        Type
                      </th>
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">
                        Start
                      </th>
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">Due</th>
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">
                        Progress
                      </th>
                      <th className="h-9 px-2 text-left text-xs font-medium sm:px-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No tasks yet.
                        </td>
                      </tr>
                    ) : (
                      tasks.map((t) => {
                        const progressPct = taskTimeProgressPercentFromLogs(
                          t,
                          taskTimeLogTotals[t.id] ?? 0
                        );
                        const dueTone = dueDateProjectListTone(t.due_date, t.task_status_slug);
                        const dueCellClass =
                          dueTone === "overdue"
                            ? "font-medium text-red-600 dark:text-red-400"
                            : dueTone === "ok"
                              ? "font-medium text-emerald-600 dark:text-emerald-500"
                              : "text-muted-foreground";
                        return (
                          <tr
                            key={t.id}
                            className="border-b last:border-0 hover:bg-muted/40"
                          >
                            <td className="max-w-0 p-2 align-middle font-mono text-xs text-muted-foreground whitespace-nowrap sm:p-3">
                              {t.task_number}
                            </td>
                            <td className="max-w-0 p-2 align-middle sm:p-3">
                              <Link
                                href={`/admin/projects/${project.id}/tasks/${t.id}?from=project`}
                                title={t.title}
                                className="block truncate font-medium text-primary hover:underline"
                              >
                                {t.title}
                              </Link>
                            </td>
                            <td className="max-w-0 overflow-hidden p-2 align-middle sm:p-3 whitespace-nowrap">
                              <TermBadge
                                term={
                                  resolveTaskCustomizerTerm(taskTypeTerms, t.task_type_slug)
                                }
                              />
                            </td>
                            <td className="max-w-0 p-2 align-middle text-muted-foreground whitespace-nowrap sm:p-3">
                              {formatDate(t.start_date)}
                            </td>
                            <td
                              className={cn(
                                "max-w-0 p-2 align-middle whitespace-nowrap tabular-nums sm:p-3",
                                dueCellClass
                              )}
                            >
                              {formatDate(t.due_date)}
                            </td>
                            <td className="max-w-0 p-2 align-middle whitespace-nowrap sm:p-3">
                              {progressPct == null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    "tabular-nums font-semibold",
                                    progressPct > 100
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-emerald-600 dark:text-emerald-500"
                                  )}
                                >
                                  {progressPct}%
                                </span>
                              )}
                            </td>
                            <td className="max-w-0 overflow-hidden p-2 align-middle sm:p-3 whitespace-nowrap">
                              <TermBadge
                                term={
                                  resolveTaskCustomizerTerm(taskStatusTerms, t.task_status_slug)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-0 space-y-4 outline-none">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h2 className="text-lg font-medium">Events</h2>
                    <Button asChild className="shrink-0">
                      <Link
                        href={`/admin/events/new?project_id=${encodeURIComponent(project.id)}&from=project`}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Add event
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    All calendar events linked to this project, oldest first. Past events are
                    de-emphasized for reference. Add an event to pre-fill this project.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-9 px-4 text-left font-medium">Title</th>
                          <th className="h-9 px-4 text-left font-medium">Start</th>
                          <th className="h-9 px-4 text-left font-medium">End</th>
                          <th className="h-9 w-28 px-4 text-left font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProjectEvents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              No events linked to this project.
                            </td>
                          </tr>
                        ) : (
                          sortedProjectEvents.map((ev) => {
                            const past = isEventPast(ev);
                            return (
                              <tr
                                key={ev.id}
                                className={cn(
                                  "border-b transition-colors hover:bg-muted/50",
                                  past && "italic text-muted-foreground opacity-70"
                                )}
                              >
                                <td className="p-3 font-medium">
                                  <Link
                                    href={`/admin/events/${ev.id}/edit`}
                                    className={cn(
                                      "hover:underline",
                                      past ? "text-muted-foreground" : "text-primary"
                                    )}
                                  >
                                    {ev.title}
                                  </Link>
                                </td>
                                <td className="p-3 tabular-nums">{formatDate(ev.start_date)}</td>
                                <td className="p-3 tabular-nums">{formatDate(ev.end_date)}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                                      <Link href={`/admin/events/${ev.id}/edit`}>Edit</Link>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-muted-foreground"
                                      onClick={() => unlinkEvent(ev.id)}
                                    >
                                      Unlink
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="mt-0 outline-none">
              <div className="space-y-3 pb-2">
                <h2 className="text-lg font-medium">Transactions</h2>
                <p className="text-sm text-muted-foreground">
                  Orders and invoices linked to this project. Project total = sum of order totals.
                </p>
                <p className="text-sm font-medium tabular-nums">
                  Project total: {orders.length > 0 ? orders[0].currency : "USD"}{" "}
                  {projectTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-9 px-4 text-left font-medium">Type</th>
                      <th className="h-9 px-4 text-left font-medium">Date</th>
                      <th className="h-9 px-4 text-left font-medium">Number</th>
                      <th className="h-9 px-4 text-right font-medium">Total</th>
                      <th className="h-9 px-4 text-left font-medium">Status</th>
                      <th className="h-9 w-24 px-4 text-left font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {mergedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No orders or invoices linked to this project.
                        </td>
                      </tr>
                    ) : (
                      mergedTransactions.map((row) => (
                        <tr key={`${row.type}-${row.id}`} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="p-3 capitalize">{row.type}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(row.at)}</td>
                          <td className="p-3 font-medium">{row.number}</td>
                          <td className="p-3 text-right tabular-nums">
                            {row.currency}{" "}
                            {Number(row.total).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3 capitalize text-muted-foreground">{row.status}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                                <Link
                                  href={
                                    row.type === "order"
                                      ? `/admin/ecommerce/orders/${row.id}`
                                      : `/admin/ecommerce/invoices/${row.id}`
                                  }
                                >
                                  View
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground"
                                onClick={() =>
                                  row.type === "order" ? unlinkOrder(row.id) : unlinkInvoice(row.id)
                                }
                              >
                                Unlink
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 outline-none">
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
                <Paperclip className="size-10 text-muted-foreground/50" aria-hidden />
                <h3 className="text-base font-medium">Attachments</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  File uploads and document links for this project will appear here. Wiring is
                  planned in a follow-up pass.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="deliverables" className="mt-0 outline-none">
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
                <Package className="size-10 text-muted-foreground/50" aria-hidden />
                <h3 className="text-base font-medium">Deliverables</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Milestones, handoffs, and delivery tracking for this project will appear here.
                  Wiring is planned in a follow-up pass.
                </p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
