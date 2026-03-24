"use client";

import { useState, useEffect, type ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { View } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Pencil,
  Archive,
  ArchiveRestore,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  Hash,
  MoreHorizontal,
  Paperclip,
  Receipt,
  Share2,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Event } from "@/lib/supabase/events";
import type { Project, Task, ProjectMember } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { formatMinutesAsHoursMinutes } from "@/lib/supabase/projects";
import type { OrderRow } from "@/lib/shop/orders";
import type { InvoiceRow } from "@/lib/shop/invoices";
import type { TaxonomyTermDisplay } from "@/lib/supabase/taxonomy";
import { cn } from "@/lib/utils";
import { EventsCalendar } from "@/components/events/EventsCalendar";
import { ProjectProgressSegments, type ProjectProgressSegment } from "@/components/projects/ProjectProgressSegments";
import { TaxonomyChips } from "@/components/taxonomy/TaxonomyChips";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

/** Progress bar: logged / estimated. Greyed 0% when no estimate; bar fill capped at 100%. */
function ProjectProgressBar({
  loggedMinutes,
  estimatedMinutes,
}: {
  loggedMinutes: number;
  estimatedMinutes: number | null;
}) {
  const hasEstimate = estimatedMinutes != null && estimatedMinutes > 0;
  const pct = hasEstimate
    ? Math.round((loggedMinutes / estimatedMinutes) * 100)
    : 0;
  const barPct = hasEstimate ? Math.min(100, pct) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-2 flex-1 max-w-[120px] rounded-full overflow-hidden",
          hasEstimate ? "bg-muted" : "bg-muted opacity-60"
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={hasEstimate ? undefined : 100}
        aria-label="Project time progress"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            hasEstimate ? "bg-primary" : "bg-muted-foreground/40"
          )}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

interface ProjectDetailClientProps {
  project: Project;
  initialTasks: Task[];
  initialOrders: OrderRow[];
  initialInvoices: InvoiceRow[];
  projectTotal: number;
  /** Total minutes logged across all tasks in this project (time logs). */
  projectTimeLogMinutes: number;
  projectTaxonomy: { categories: TaxonomyTermDisplay[]; tags: TaxonomyTermDisplay[] };
  projectStatusTerms: StatusOrTypeTerm[];
  projectTypeTerms: StatusOrTypeTerm[];
  taskStatusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  initialProjectEvents: Event[];
  clientDisplayName: string | null;
  initialProjectMembers: (ProjectMember & { label: string; role_label: string | null })[];
  projectRoleTerms: StatusOrTypeTerm[];
}

type TabId = "tasks" | "events" | "transactions" | "attachments";

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
    <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-foreground font-semibold text-base leading-tight">{value}</p>
      {sub ? <p className="text-muted-foreground text-xs">{sub}</p> : null}
    </div>
  );
}

export function ProjectDetailClient({
  project,
  initialTasks,
  initialOrders,
  initialInvoices,
  projectTotal,
  projectTimeLogMinutes,
  projectTaxonomy,
  projectStatusTerms,
  projectTypeTerms,
  taskStatusTerms,
  taskTypeTerms,
  initialProjectEvents,
  clientDisplayName,
  initialProjectMembers,
  projectRoleTerms: _projectRoleTerms,
}: ProjectDetailClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [orders, setOrders] = useState(initialOrders);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [projectEvents, setProjectEvents] = useState(initialProjectEvents);
  const [projectMembers, setProjectMembers] = useState(initialProjectMembers);
  const [projectEventsDate, setProjectEventsDate] = useState(() => new Date());
  const [projectEventsView, setProjectEventsView] = useState<View>("month");
  const [tab, setTab] = useState<TabId>("tasks");
  const [archivedAt, setArchivedAt] = useState(project.archived_at);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isArchived = !!archivedAt;

  useEffect(() => {
    setProjectMembers(initialProjectMembers);
  }, [initialProjectMembers]);

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
    project.project_type_term_id != null
      ? projectTypeTerms.find((t) => t.id === project.project_type_term_id) ?? null
      : null;
  const typeLabel = typeTerm?.name?.trim() || "—";

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(
    (t) => (t.task_status_slug ?? "").trim().toLowerCase() === "done"
  ).length;
  const taskProgressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const estimatedMinutes = project.proposed_time ?? null;
  const hasBudget = estimatedMinutes != null && estimatedMinutes > 0;
  const utilizationPct = hasBudget
    ? Math.min(100, Math.round((projectTimeLogMinutes / estimatedMinutes) * 100))
    : 0;

  const progressSegments: ProjectProgressSegment[] = (() => {
    const now = Date.now();
    return tasks.map((task): ProjectProgressSegment => {
      const slug = (task.task_status_slug ?? "").trim().toLowerCase();
      const isDone = slug === "done";
      const isCancelled = slug === "cancelled";
      const overdue =
        !isDone &&
        !isCancelled &&
        !!task.due_date &&
        new Date(task.due_date).getTime() < now;
      return {
        id: task.id,
        state: isDone ? "done" : overdue ? "overdue" : isCancelled ? "cancelled" : "todo",
      };
    });
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top bar: Activities → Projects → detail; back + placeholder actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/admin/projects">
              <ArrowLeft className="h-4 w-4 mr-1" />
              All projects
            </Link>
          </Button>
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            /
          </span>
          <p className="text-xs text-muted-foreground sm:ml-0">
            <span className="font-medium text-foreground/80">Activities</span>
            <span className="mx-1.5 text-muted-foreground/70">/</span>
            <Link href="/admin/projects" className="hover:text-foreground hover:underline">
              Projects
            </Link>
            <span className="mx-1.5 text-muted-foreground/70">/</span>
            <span className="truncate">Project detail</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            disabled
            aria-label="Share (not wired yet)"
            title="Share — coming soon"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            disabled
            aria-label="More actions (not wired yet)"
            title="More — coming soon"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview (donor-style hero; wired to current project data) */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Hash className="size-3 shrink-0" aria-hidden />
                <span className="truncate" title={project.id}>
                  {project.id.slice(0, 8)}…
                </span>
              </span>
              {isArchived ? (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Archived
                </span>
              ) : null}
            </div>
            <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <TermBadge term={projectStatusTerms.find((t) => t.id === project.status_term_id)} />
              {typeTerm ? <TermBadge term={typeTerm} /> : null}
            </div>
            {clientDisplayName ? (
              <p className="text-sm text-muted-foreground">
                Client: <span className="text-foreground">{clientDisplayName}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/projects/${project.id}/edit`}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={toggleArchive} disabled={busy}>
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-1" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </>
              )}
            </Button>
            <Button size="sm" asChild>
              <Link href={`/admin/projects/${project.id}/tasks/new`}>Add task</Link>
            </Button>
          </div>
        </div>

        {project.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {project.description}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No description yet.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OverviewStatCard icon={Tag} label="Type" value={typeLabel} />
          <OverviewStatCard
            icon={Calendar}
            label="Start"
            value={formatDate(project.proposed_start_date)}
          />
          <OverviewStatCard
            icon={Calendar}
            label="End"
            value={formatDate(project.proposed_end_date)}
            sub={project.end_date_extended ? "End date extended" : undefined}
          />
          <OverviewStatCard
            icon={Clock}
            label="Est. time"
            value={formatMinutesAsHoursMinutes(project.proposed_time)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OverviewStatCard
            icon={Clock}
            label="Logged time"
            value={formatMinutesAsHoursMinutes(projectTimeLogMinutes)}
            sub={
              hasBudget
                ? `of ${formatMinutesAsHoursMinutes(estimatedMinutes)} estimated`
                : "No estimate set"
            }
          />
          <OverviewStatCard
            icon={TrendingUp}
            label="Utilization"
            value={hasBudget ? `${utilizationPct}%` : "—"}
            sub={hasBudget ? "of budget consumed" : "Set estimated time to track"}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden />
              Task progress
            </div>
            <span className="text-sm font-semibold text-primary tabular-nums">
              {doneTasks}/{totalTasks} tasks — {taskProgressPct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${taskProgressPct}%` }}
              role="progressbar"
              aria-valuenow={taskProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tasks completed"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">By task</span>
            <ProjectProgressSegments segments={progressSegments} className="min-w-[140px] max-w-full flex-1" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Users className="size-4 text-primary shrink-0" aria-hidden />
              Team
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/projects/${project.id}/edit`}>Manage members</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {projectMembers.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                No members yet. Edit project to add client and members.
              </span>
            ) : (
              projectMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 py-1 pl-1 pr-3"
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary"
                    title={m.label}
                  >
                    {initials(m.label)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold leading-none">{m.label}</span>
                    {m.role_label ? (
                      <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                        {m.role_label}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-4">
          <div>
            <span className="block font-medium text-foreground/80">Time vs estimate</span>
            <ProjectProgressBar
              loggedMinutes={projectTimeLogMinutes}
              estimatedMinutes={project.proposed_time ?? null}
            />
          </div>
          <div>
            <span className="font-medium text-foreground/80">Potential sales</span>
            <p className="tabular-nums">
              {project.potential_sales != null
                ? Number(project.potential_sales).toLocaleString()
                : "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium text-foreground/80">MAG</span>
            <p className="font-mono text-[11px]">{project.required_mag_id ?? "—"}</p>
          </div>
        </div>

        {(projectTaxonomy.categories.length > 0 || projectTaxonomy.tags.length > 0) && (
          <div className="border-t border-border pt-4">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Categories & tags
            </span>
            <TaxonomyChips categories={projectTaxonomy.categories} tags={projectTaxonomy.tags} />
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-medium">Categories & tags</h2>
          <p className="text-sm text-muted-foreground">Assign taxonomy for this project.</p>
        </CardHeader>
        <CardContent>
          <TaxonomyAssignmentForContent
            contentId={project.id}
            contentTypeSlug="project"
            section="project"
            sectionLabel="Projects"
            compact
            onSaved={() => router.refresh()}
          />
        </CardContent>
      </Card>

      {/* Donor-aligned tabs: Tasks | Events | Transactions | Attachments */}
      <Card className="overflow-hidden shadow-sm">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-full">
          <TabsList
            className="flex h-auto w-full flex-wrap justify-start gap-0 rounded-none border-b border-border bg-transparent p-0"
            aria-label="Project sections"
          >
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
          </TabsList>

          <CardContent className="p-4 sm:p-6">
            <TabsContent value="tasks" className="mt-0 outline-none">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Tasks</h2>
                <Button size="sm" asChild>
                  <Link href={`/admin/projects/${project.id}/tasks/new`}>Add task</Link>
                </Button>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-9 px-4 text-left font-medium">Task ID</th>
                      <th className="h-9 px-4 text-left font-medium">Title</th>
                      <th className="h-9 px-4 text-left font-medium">Status</th>
                      <th className="h-9 px-4 text-left font-medium">Start</th>
                      <th className="h-9 px-4 text-left font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No tasks yet.
                        </td>
                      </tr>
                    ) : (
                      tasks.map((t) => (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {t.task_number}
                          </td>
                          <td className="p-3 font-medium">
                            <Link
                              href={`/admin/projects/${project.id}/tasks/${t.id}?from=project`}
                              className="text-primary hover:underline"
                            >
                              {t.title}
                            </Link>
                          </td>
                          <td className="p-3">
                            <TermBadge term={taskStatusTerms.find((s) => s.id === t.task_status_slug)} />
                            {t.task_type_slug ? (
                              <TermBadge
                                className="ml-1"
                                term={taskTypeTerms.find((s) => s.id === t.task_type_slug) ?? null}
                              />
                            ) : null}
                          </td>
                          <td className="p-3 text-muted-foreground">{formatDate(t.start_date)}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(t.due_date)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-0 space-y-4 outline-none">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-medium">Events</h2>
                      <p className="text-sm text-muted-foreground">
                        Calendar events linked to this project. Add a new event here to pre-fill the
                        project link.
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/admin/events/new?project_id=${encodeURIComponent(project.id)}`}>
                        <Calendar className="h-4 w-4 mr-1" />
                        Add event
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="min-h-[540px]">
                    <EventsCalendar
                      events={projectEvents}
                      date={projectEventsDate}
                      view={projectEventsView}
                      onDateChange={setProjectEventsDate}
                      onViewChange={setProjectEventsView}
                      height={520}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <h3 className="text-base font-medium">Linked events</h3>
                  <p className="text-sm text-muted-foreground">
                    Edit or unlink events from the project record.
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
                          <th className="h-9 w-24 px-4 text-left font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {projectEvents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              No events linked to this project.
                            </td>
                          </tr>
                        ) : (
                          projectEvents.map((ev) => (
                            <tr key={ev.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{ev.title}</td>
                              <td className="p-3 text-muted-foreground">{formatDate(ev.start_date)}</td>
                              <td className="p-3 text-muted-foreground">{formatDate(ev.end_date)}</td>
                              <td className="p-3 flex gap-1">
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
                              </td>
                            </tr>
                          ))
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
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
