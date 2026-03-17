"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Pencil, Archive, ArchiveRestore, Receipt, ListOrdered, Calendar } from "lucide-react";
import type { Event } from "@/lib/supabase/events";
import type { Project, Task, TaskPriorityTerm, ProjectMember } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { formatMinutesAsHoursMinutes } from "@/lib/supabase/projects";
import type { OrderRow } from "@/lib/shop/orders";
import type { InvoiceRow } from "@/lib/shop/invoices";
import type { TaxonomyTermDisplay } from "@/lib/supabase/taxonomy";
import { cn } from "@/lib/utils";
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
  priorityTerms: TaskPriorityTerm[];
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

type TabId = "overview" | "transactions" | "events";

export function ProjectDetailClient({
  project,
  initialTasks,
  initialOrders,
  initialInvoices,
  projectTotal,
  projectTimeLogMinutes,
  priorityTerms,
  projectTaxonomy,
  projectStatusTerms,
  projectTypeTerms,
  taskStatusTerms,
  taskTypeTerms,
  initialProjectEvents,
  clientDisplayName,
  initialProjectMembers,
  projectRoleTerms,
}: ProjectDetailClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [orders, setOrders] = useState(initialOrders);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [projectEvents, setProjectEvents] = useState(initialProjectEvents);
  const [projectMembers, setProjectMembers] = useState(initialProjectMembers);
  const [tab, setTab] = useState<TabId>("overview");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        <Button
          variant={tab === "overview" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("overview")}
        >
          <ListOrdered className="h-4 w-4 mr-1" />
          Overview
        </Button>
        <Button
          variant={tab === "transactions" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("transactions")}
        >
          <Receipt className="h-4 w-4 mr-1" />
          Transactions
        </Button>
        <Button
          variant={tab === "events" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("events")}
        >
          <Calendar className="h-4 w-4 mr-1" />
          Events
        </Button>
      </div>

      {tab === "overview" && (
      <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {isArchived && (
                <span className="text-sm text-muted-foreground">Archived</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/projects/${project.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleArchive}
                disabled={busy}
              >
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.description}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {clientDisplayName != null && (
              <>
                <dt className="text-muted-foreground">Client</dt>
                <dd>{clientDisplayName}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <TermBadge term={projectStatusTerms.find((t) => t.id === project.status_term_id)} />
              {project.project_type_term_id && (
                <TermBadge
                  className="ml-1"
                  term={projectTypeTerms.find((t) => t.id === project.project_type_term_id) ?? null}
                />
              )}
            </dd>
            <dt className="text-muted-foreground">Proposed start</dt>
            <dd>{formatDate(project.proposed_start_date)}</dd>
            <dt className="text-muted-foreground">Proposed end</dt>
            <dd>{formatDate(project.proposed_end_date)}</dd>
            {project.end_date_extended && (
              <>
                <dt className="text-muted-foreground" />
                <dd className="text-muted-foreground text-xs">End date extended</dd>
              </>
            )}
            <dt className="text-muted-foreground">Estimated time</dt>
            <dd>{formatMinutesAsHoursMinutes(project.proposed_time)}</dd>
            <dt className="text-muted-foreground">Logged time (total)</dt>
            <dd>{formatMinutesAsHoursMinutes(projectTimeLogMinutes)}</dd>
            <dt className="text-muted-foreground">Progress</dt>
            <dd>
              <ProjectProgressBar
                loggedMinutes={projectTimeLogMinutes}
                estimatedMinutes={project.proposed_time ?? null}
              />
            </dd>
            <dt className="text-muted-foreground">Potential sales</dt>
            <dd>
              {project.potential_sales != null
                ? Number(project.potential_sales).toLocaleString()
                : "—"}
            </dd>
            <dt className="text-muted-foreground">MAG</dt>
            <dd className="text-xs text-muted-foreground">
              {project.required_mag_id ?? "—"}
            </dd>
          </dl>
          {(projectTaxonomy.categories.length > 0 || projectTaxonomy.tags.length > 0) && (
            <div className="pt-2">
              <span className="text-sm text-muted-foreground mr-2">Categories & tags:</span>
              <TaxonomyChips categories={projectTaxonomy.categories} tags={projectTaxonomy.tags} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Members</h2>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/projects/${project.id}/edit`}>
                Manage members
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {projectMembers.length === 0 ? (
              <span className="text-sm text-muted-foreground">No members yet. Edit project to add client and members.</span>
            ) : (
              projectMembers.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 pl-2 pr-2.5 py-1 text-sm"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary"
                    title={m.label}
                  >
                    {initials(m.label)}
                  </span>
                  <span className="truncate max-w-[120px]">{m.label}</span>
                  {m.role_label && (
                    <span className="text-muted-foreground text-xs">({m.role_label})</span>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-medium">Categories & tags</h2>
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

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Tasks</h2>
            <Button size="sm" asChild>
              <Link href={`/admin/projects/${project.id}/tasks/new`}>
                Add task
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-4 text-left font-medium">Title</th>
                  <th className="h-9 px-4 text-left font-medium">Status</th>
                  <th className="h-9 px-4 text-left font-medium">Priority</th>
                  <th className="h-9 px-4 text-left font-medium">Start</th>
                  <th className="h-9 px-4 text-left font-medium">Due</th>
                  <th className="h-9 w-20 px-4 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No tasks yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{t.title}</td>
                      <td className="p-3">
                        <TermBadge term={taskStatusTerms.find((s) => s.id === t.status_term_id)} />
                        {t.task_type_term_id && (
                          <TermBadge
                            className="ml-1"
                            term={taskTypeTerms.find((s) => s.id === t.task_type_term_id) ?? null}
                          />
                        )}
                      </td>
                      <td className="p-3">
                        <TermBadge term={priorityTerms.find((p) => p.id === t.priority_term_id) ?? null} />
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(t.start_date)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(t.due_date)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link href={`/admin/projects/${project.id}/tasks/${t.id}`}>
                            View
                          </Link>
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
      </>
      )}

      {tab === "transactions" && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Transactions</h2>
            <p className="text-sm text-muted-foreground">
              Orders and invoices linked to this project. Project total = sum of order totals.
            </p>
            <p className="text-sm font-medium">
              Project total: {orders.length > 0 ? orders[0].currency : "USD"} {projectTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No orders or invoices linked to this project.
                      </td>
                    </tr>
                  ) : (
                    mergedTransactions.map((row) => (
                      <tr key={`${row.type}-${row.id}`} className="border-b hover:bg-muted/50">
                        <td className="p-3 capitalize">{row.type}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(row.at)}</td>
                        <td className="p-3 font-medium">{row.number}</td>
                        <td className="p-3 text-right">{row.currency} {Number(row.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-muted-foreground capitalize">{row.status}</td>
                        <td className="p-3 flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                            <Link href={row.type === "order" ? `/admin/ecommerce/orders/${row.id}` : `/admin/ecommerce/invoices/${row.id}`}>
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground"
                            onClick={() => row.type === "order" ? unlinkOrder(row.id) : unlinkInvoice(row.id)}
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
      )}

      {tab === "events" && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Events</h2>
            <p className="text-sm text-muted-foreground">
              Calendar events linked to this project. Link an event from the event edit form (Project field).
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
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
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
      )}
    </div>
  );
}
