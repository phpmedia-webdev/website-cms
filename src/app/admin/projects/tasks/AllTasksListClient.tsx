"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Plus, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project, Task } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import type { AdminTasksListBundle, TaskAssigneeListItem } from "@/lib/tasks/admin-task-list";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import { normalizeHex } from "@/lib/event-type-colors";
import { dueDateScheduleHint, initialsFromLabel } from "@/lib/tasks/display-helpers";
import { taskTermForSlug } from "@/lib/tasks/merge-task-customizer-colors";
import { taskDetailPath } from "@/lib/tasks/task-detail-nav";
import {
  DEFAULT_ALL_TASKS_SORT,
  PRESET_FLAT_DUE_SORT,
  toggleAllTasksSort,
  sortAllTasksForDisplay,
  type AllTasksSortColumn,
  type AllTasksSortState,
  type AllTasksSortContext,
} from "@/lib/tasks/all-tasks-sort";
import {
  TASK_STATUS_SLUG_COMPLETED,
  isTaskStatusCompletedSlug,
} from "@/lib/tasks/task-status-reserved";
import { cn } from "@/lib/utils";

export type TaskAssigneeItem = TaskAssigneeListItem;

export interface AssigneeMemberRow {
  project_id: string;
  user_id: string | null;
  contact_id: string | null;
}

/** Rows from Customizer scope `task_phase` (display order preserved). */
export interface TaskPhaseOption {
  slug: string;
  label: string;
  color: string | null;
}

type MemberCell = { user_id: string | null; contact_id: string | null };

const PHASE_DOT_FALLBACK = "#94a3b8";

function PhaseDot({ color }: { color: string | null | undefined }) {
  const bg =
    color != null && String(color).trim() ? normalizeHex(String(color)) : PHASE_DOT_FALLBACK;
  return (
    <span
      className="size-2.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
      style={{ backgroundColor: bg }}
      aria-hidden
    />
  );
}

function normalizePhaseSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

const TASK_TYPE_SELECT_ALL = "__all_task_types__";
const TASK_STATUS_SELECT_ALL = "__all_task_status__";
const NO_PROJECT_SELECT_VALUE = "__no_project__";

/**
 * All Tasks toolbar search — stronger border/background than default Input so the field reads clearly on the page.
 */
const ALL_TASKS_TOOLBAR_SEARCH = {
  wrapper: "relative w-full min-w-0 md:min-w-[7rem] md:flex-1",
  icon: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/55 dark:text-foreground/50",
  input:
    "h-8 w-full min-w-0 border-2 border-border bg-card pl-7 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-ring",
} as const;

/** Column widths (sum 100%). Tune here only. 17 / 12 / 15 / 12 / 12 / 10 / 10 / 12. */
const ALL_TASKS_TABLE_COL = {
  title: "w-[17%] min-w-0",
  project: "w-[12%] min-w-0",
  assignee: "w-[15%] min-w-0",
  phase: "w-[12%] min-w-0",
  type: "w-[12%] min-w-0",
  dueDate: "w-[10%] min-w-0",
  progress: "w-[10%] min-w-0",
  status: "w-[12%] min-w-0",
} as const;

const ALL_TASKS_TABLE_TD = "p-3 align-top min-w-0";

/** §1.3 toolbar presets — drive exclude_status_slugs / due_before on GET /api/tasks. */
type TasksPresetId = "none" | "all_active" | "my_tasks" | "overdue";

/** Default landing preset: incomplete tasks only; archived projects excluded server-side (**197**). */
const DEFAULT_TASKS_PRESET: TasksPresetId = "all_active";

/** Master reset → full **recap**: all statuses, still no archived-project tasks (**197**); sort due → title. */
const RECAP_RESET_PRESET: TasksPresetId = "none";

function localCalendarDateISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildTasksQuery(
  projectIds: Set<string>,
  assigneeUserIds: Set<string>,
  assigneeContactIds: Set<string>,
  phaseSlugs: Set<string>,
  taskTypeSlug: string | null,
  taskStatusSlug: string | null,
  tasksPreset: TasksPresetId
): string {
  const q = new URLSearchParams();
  if (projectIds.size > 0) {
    q.set("project_ids", [...projectIds].join(","));
  }
  if (assigneeUserIds.size > 0) {
    q.set("assignee_user_ids", [...assigneeUserIds].join(","));
  }
  if (assigneeContactIds.size > 0) {
    q.set("assignee_contact_ids", [...assigneeContactIds].join(","));
  }
  if (phaseSlugs.size > 0) {
    q.set("phase_slugs", [...phaseSlugs].map((s) => s.trim().toLowerCase()).join(","));
  }
  if (taskTypeSlug != null && taskTypeSlug.trim() !== "") {
    q.set("type_slugs", taskTypeSlug.trim().toLowerCase());
  }
  if (taskStatusSlug != null && taskStatusSlug.trim() !== "") {
    q.set("status_slugs", taskStatusSlug.trim().toLowerCase());
  }
  if (
    tasksPreset === "all_active" ||
    tasksPreset === "my_tasks" ||
    tasksPreset === "overdue"
  ) {
    q.set("exclude_status_slugs", TASK_STATUS_SLUG_COMPLETED);
  }
  if (tasksPreset === "overdue") {
    q.set("due_before", localCalendarDateISO());
  }
  return q.toString();
}

function scopeProjectIdsForMembers(selectedProjects: Set<string>, pickerProjects: Project[]): string[] {
  if (selectedProjects.size > 0) return [...selectedProjects];
  return pickerProjects.map((p) => p.id);
}

function collectAssigneeIdsForProjects(
  scopeIds: string[],
  membersByProject: Map<string, MemberCell[]>
): { users: Set<string>; contacts: Set<string> } {
  const users = new Set<string>();
  const contacts = new Set<string>();
  for (const pid of scopeIds) {
    for (const m of membersByProject.get(pid) ?? []) {
      if (m.user_id) users.add(m.user_id);
      if (m.contact_id) contacts.add(m.contact_id);
    }
  }
  return { users, contacts };
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

function isAdminTasksBundle(data: unknown): data is AdminTasksListBundle {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return (
    Array.isArray(o.tasks) &&
    typeof o.taskAssigneesMap === "object" &&
    o.taskAssigneesMap !== null &&
    typeof o.taskTimeLogTotals === "object" &&
    o.taskTimeLogTotals !== null &&
    typeof o.phaseSlugByTaskId === "object" &&
    o.phaseSlugByTaskId !== null
  );
}

/**
 * Assignee column: overlapping circles (photo or initials), one per assignee up to `max`, then "+N" for the rest.
 */
function TaskAssigneeAvatars({ assignees }: { assignees: TaskAssigneeItem[] }) {
  const max = 3;
  const visible = assignees.slice(0, max);
  const overflow = assignees.length - visible.length;
  const allNames = assignees.map((a) => a.label).join(", ");

  if (visible.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-0 items-center gap-0.5" title={allNames}>
      <div className="flex -space-x-1.5">
        {visible.map((a) => (
          <span
            key={a.id}
            title={a.label}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-background bg-muted text-[8px] font-medium text-muted-foreground"
          >
            {a.avatarUrl ? (
              <img src={a.avatarUrl} alt={a.label} className="h-full w-full object-cover" />
            ) : (
              initialsFromLabel(a.label)
            )}
          </span>
        ))}
      </div>
      {overflow > 0 ? (
        <span
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
          title={`${overflow} more: ${assignees
            .slice(max)
            .map((x) => x.label)
            .join(", ")}`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function phaseTermForSlug(
  taskPhaseTerms: StatusOrTypeTerm[],
  slug: string | null | undefined
): StatusOrTypeTerm | null {
  if (!slug || !String(slug).trim()) return null;
  const key = String(slug).trim().toLowerCase();
  return taskPhaseTerms.find((p) => p.slug.trim().toLowerCase() === key) ?? null;
}

type AssigneeOption = { kind: "user" | "contact"; id: string; label: string };

const UNKNOWN_SORT_INDEX = 999_999;

function AllTasksSortColumnHeader({
  column,
  label,
  colClass,
  sortState,
  onToggleSort,
  title: headerTitle,
}: {
  column: AllTasksSortColumn;
  label: string;
  colClass: string;
  sortState: AllTasksSortState;
  onToggleSort: (column: AllTasksSortColumn) => void;
  title?: string;
}) {
  const active = sortState.column === column;
  const ariaSort =
    active && sortState.direction === "asc"
      ? "ascending"
      : active && sortState.direction === "desc"
        ? "descending"
        : "none";
  const ariaLabel = active
    ? `${label}, sorted ${sortState.direction === "asc" ? "ascending" : "descending"}. Click to reverse.`
    : `${label}. Click to sort.`;
  return (
    <th scope="col" aria-sort={ariaSort} className={cn("p-0", colClass)}>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-0.5 px-4 text-left text-sm font-medium",
          "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active && "bg-muted/50"
        )}
        onClick={() => onToggleSort(column)}
        title={headerTitle}
        aria-label={ariaLabel}
      >
        <span className="min-w-0 truncate">{label}</span>
        {active ? (
          <span className="shrink-0 tabular-nums text-muted-foreground" aria-hidden>
            {sortState.direction === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </th>
  );
}

function AllTasksTableDataRow({
  t,
  phaseSlugByTaskId,
  taskPhaseTerms,
  taskTypeTerms,
  statusTerms,
  projectMap,
  taskAssigneesMap,
  taskTimeLogTotals,
}: {
  t: Task;
  phaseSlugByTaskId: Record<string, string | null>;
  taskPhaseTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  statusTerms: StatusOrTypeTerm[];
  projectMap: Map<string, string>;
  taskAssigneesMap: Record<string, TaskAssigneeItem[]>;
  taskTimeLogTotals: Record<string, number>;
}) {
  const phaseTerm = taskTermForSlug(taskPhaseTerms, phaseSlugByTaskId[t.id] ?? null);
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.title}`}>
        <Link
          href={taskDetailPath(t.id, t.project_id, "tasks")}
          className="block break-words font-semibold text-primary hover:underline"
        >
          {t.title}
        </Link>
        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{t.task_number}</div>
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.project}`}>
        {t.project_id?.trim() ? (
          <Link
            href={`/admin/projects/${t.project_id}`}
            className="block truncate text-primary hover:underline"
            title={projectMap.get(t.project_id) ?? undefined}
          >
            {projectMap.get(t.project_id) ?? t.project_id.slice(0, 8) + "…"}
          </Link>
        ) : (
          <span className="block truncate text-muted-foreground">No project</span>
        )}
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.assignee}`}>
        <TaskAssigneeAvatars assignees={taskAssigneesMap[t.id] ?? []} />
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.phase}`}>
        <div className="min-w-0 max-w-full">
          <TermBadge term={phaseTerm} />
        </div>
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.type}`}>
        <div className="min-w-0 max-w-full">
          <TermBadge term={taskTermForSlug(taskTypeTerms, t.task_type_slug)} />
        </div>
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.dueDate}`}>
        {(() => {
          /** Matches **Overdue** preset: completed tasks are excluded server-side — don’t style their due date as actionable overdue. */
          const hint = isTaskStatusCompletedSlug(t.task_status_slug)
            ? null
            : dueDateScheduleHint(t.due_date);
          const text = formatDate(t.due_date);
          if (hint === null) {
            return <span className="text-muted-foreground">{text}</span>;
          }
          if (hint === "overdue") {
            return (
              <span className="font-medium text-red-600 dark:text-red-500" title="Past due">
                {text}
              </span>
            );
          }
          return (
            <span
              className="font-medium text-green-600 dark:text-green-500"
              title="Due today or later"
            >
              {text}
            </span>
          );
        })()}
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.progress}`}>
        {(() => {
          const estimated = t.planned_time ?? 0;
          const spent = taskTimeLogTotals[t.id] ?? 0;
          if (estimated <= 0) return <span className="text-muted-foreground">—</span>;
          const pct = Math.round((spent / estimated) * 100);
          return (
            <span
              className={pct <= 100 ? "text-green-600 font-medium" : "text-red-600 font-medium"}
              title={`${spent} min / ${estimated} min`}
            >
              {pct}%
            </span>
          );
        })()}
      </td>
      <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.status}`}>
        <div className="min-w-0 max-w-full">
          <TermBadge term={taskTermForSlug(statusTerms, t.task_status_slug)} />
        </div>
      </td>
    </tr>
  );
}

interface AllTasksListClientProps {
  initialProjects: Project[];
  pickerProjects: Project[];
  assigneeMemberRows: AssigneeMemberRow[];
  assigneeUserDisplay: Record<string, { label: string; avatarUrl: string | null }>;
  assigneeContactDisplay: Record<string, { label: string; avatarUrl: string | null }>;
  /** Customizer `task_phase` options (order matches Settings → Customizer). */
  taskPhaseOptions: TaskPhaseOption[];
  /** Customizer `task_type` options (single-select; same shape as phases). */
  taskTypeOptions: TaskPhaseOption[];
  /** Customizer `task_status` options (single-select). */
  taskStatusOptions: TaskPhaseOption[];
  initialTasks: Task[];
  statusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  taskPhaseTerms: StatusOrTypeTerm[];
  initialPhaseSlugByTaskId: Record<string, string | null>;
  taskAssigneesMap: Record<string, TaskAssigneeItem[]>;
  taskTimeLogTotals: Record<string, number>;
  /** Logged-in admin auth user id — **My tasks** preset uses `assignee_user_ids` (team assignee only). */
  currentUserId: string;
}

export function AllTasksListClient({
  initialProjects,
  pickerProjects,
  assigneeMemberRows,
  assigneeUserDisplay,
  assigneeContactDisplay,
  taskPhaseOptions,
  taskTypeOptions,
  taskStatusOptions,
  initialTasks,
  statusTerms,
  taskTypeTerms,
  taskPhaseTerms,
  initialPhaseSlugByTaskId,
  taskAssigneesMap: initialAssigneesMap,
  taskTimeLogTotals: initialTimeTotals,
  currentUserId,
}: AllTasksListClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [taskAssigneesMap, setTaskAssigneesMap] = useState(initialAssigneesMap);
  const [taskTimeLogTotals, setTaskTimeLogTotals] = useState(initialTimeTotals);
  const [phaseSlugByTaskId, setPhaseSlugByTaskId] = useState(initialPhaseSlugByTaskId);

  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set());
  const [selectedAssigneeUserIds, setSelectedAssigneeUserIds] = useState<Set<string>>(() => new Set());
  const [selectedAssigneeContactIds, setSelectedAssigneeContactIds] = useState<Set<string>>(
    () => new Set()
  );
  /** Lowercased phase slugs from Customizer / taxonomy. */
  const [selectedPhaseSlugs, setSelectedPhaseSlugs] = useState<Set<string>>(() => new Set());
  /** Lowercased task type slug from Customizer (`task_type`); null = all types. */
  const [selectedTaskTypeSlug, setSelectedTaskTypeSlug] = useState<string | null>(null);
  /** Lowercased task status slug from Customizer (`task_status`); null = all statuses. */
  const [selectedTaskStatusSlug, setSelectedTaskStatusSlug] = useState<string | null>(null);

  const [customFiltersOpen, setCustomFiltersOpen] = useState(false);
  const [projectDraftIds, setProjectDraftIds] = useState<Set<string>>(() => new Set());
  const [projectSearch, setProjectSearch] = useState("");

  const [assigneeDraftUserIds, setAssigneeDraftUserIds] = useState<Set<string>>(() => new Set());
  const [assigneeDraftContactIds, setAssigneeDraftContactIds] = useState<Set<string>>(() => new Set());
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [phaseDraftSlugs, setPhaseDraftSlugs] = useState<Set<string>>(() => new Set());
  const [phaseSearch, setPhaseSearch] = useState("");

  /** Draft type/status inside Custom filters modal (applied on Apply). */
  const [draftTaskTypeSlug, setDraftTaskTypeSlug] = useState<string | null>(null);
  const [draftTaskStatusSlug, setDraftTaskStatusSlug] = useState<string | null>(null);

  /** Title substring filter (client-side on current API result); updates as you type. */
  const [titleSearchQuery, setTitleSearchQuery] = useState("");

  /** Column sort (§1.2): client-side on filtered rows; default due ↑ (see `DEFAULT_ALL_TASKS_SORT`). */
  const [sortState, setSortState] = useState<AllTasksSortState>(DEFAULT_ALL_TASKS_SORT);

  /** §1.3 — drives `exclude_status_slugs` / `due_before` on the tasks API (migration **198**). */
  const [tasksPreset, setTasksPreset] = useState<TasksPresetId>(DEFAULT_TASKS_PRESET);

  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createProjectId, setCreateProjectId] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const projectMap = useMemo(
    () => new Map(initialProjects.map((p) => [p.id, p.name])),
    [initialProjects]
  );

  const membersByProject = useMemo(() => {
    const m = new Map<string, MemberCell[]>();
    for (const row of assigneeMemberRows) {
      const list = m.get(row.project_id) ?? [];
      list.push({ user_id: row.user_id, contact_id: row.contact_id });
      m.set(row.project_id, list);
    }
    return m;
  }, [assigneeMemberRows]);

  const sortedPickerProjects = useMemo(
    () => [...pickerProjects].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [pickerProjects]
  );

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return sortedPickerProjects;
    return sortedPickerProjects.filter((p) => p.name.toLowerCase().includes(q));
  }, [sortedPickerProjects, projectSearch]);

  /** While Custom filters is open, assignee list follows project *draft* selection. */
  const projectIdsForAssigneeScope = customFiltersOpen ? projectDraftIds : selectedProjectIds;

  const assigneeOptions = useMemo((): AssigneeOption[] => {
    const ids = scopeProjectIdsForMembers(projectIdsForAssigneeScope, pickerProjects);
    const seen = new Set<string>();
    const out: AssigneeOption[] = [];
    for (const pid of ids) {
      for (const m of membersByProject.get(pid) ?? []) {
        if (m.user_id) {
          const id = m.user_id;
          const key = `u:${id}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({
              kind: "user",
              id,
              label: assigneeUserDisplay[id]?.label ?? id.slice(0, 8),
            });
          }
        }
        if (m.contact_id) {
          const id = m.contact_id;
          const key = `c:${id}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({
              kind: "contact",
              id,
              label: assigneeContactDisplay[id]?.label ?? id.slice(0, 8),
            });
          }
        }
      }
    }
    out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return out;
  }, [
    projectIdsForAssigneeScope,
    pickerProjects,
    membersByProject,
    assigneeUserDisplay,
    assigneeContactDisplay,
  ]);

  const filteredAssignees = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return assigneeOptions;
    return assigneeOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [assigneeOptions, assigneeSearch]);

  const filteredPhaseOptions = useMemo(() => {
    const q = phaseSearch.trim().toLowerCase();
    if (!q) return taskPhaseOptions;
    return taskPhaseOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || normalizePhaseSlug(o.slug).includes(q)
    );
  }, [taskPhaseOptions, phaseSearch]);

  const displayTasks = useMemo(() => {
    const q = titleSearchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const title = (t.title ?? "").toLowerCase();
      const num = (t.task_number ?? "").toLowerCase();
      return title.includes(q) || num.includes(q);
    });
  }, [tasks, titleSearchQuery]);

  const sortContext = useMemo((): AllTasksSortContext => {
    const phaseSlugOrder = new Map<string, number>();
    taskPhaseOptions.forEach((o, i) => phaseSlugOrder.set(normalizePhaseSlug(o.slug), i));

    const typeSlugOrder = new Map<string, number>();
    taskTypeOptions.forEach((o, i) => typeSlugOrder.set(normalizePhaseSlug(o.slug), i));

    const statusSlugOrder = new Map<string, number>();
    taskStatusOptions.forEach((o, i) => statusSlugOrder.set(normalizePhaseSlug(o.slug), i));

    const typeIndexByTermId = new Map<string, number>();
    for (const term of taskTypeTerms) {
      const idx = typeSlugOrder.get(normalizePhaseSlug(term.slug));
      typeIndexByTermId.set(term.id, idx !== undefined ? idx : UNKNOWN_SORT_INDEX);
    }

    const statusIndexByTermId = new Map<string, number>();
    for (const term of statusTerms) {
      const idx = statusSlugOrder.get(normalizePhaseSlug(term.slug));
      statusIndexByTermId.set(term.id, idx !== undefined ? idx : UNKNOWN_SORT_INDEX);
    }

    return {
      projectName: (t) =>
        (t.project_id ? projectMap.get(t.project_id) : undefined) ?? "No project",
      phaseIndex: (t) => {
        const raw = phaseSlugByTaskId[t.id] ?? t.task_phase_slug ?? "";
        const s = String(raw).trim();
        if (!s) return UNKNOWN_SORT_INDEX;
        return phaseSlugOrder.get(normalizePhaseSlug(s)) ?? UNKNOWN_SORT_INDEX;
      },
      typeIndex: (t) =>
        typeIndexByTermId.get(normalizePhaseSlug(t.task_type_slug)) ?? UNKNOWN_SORT_INDEX,
      statusIndex: (t) =>
        statusIndexByTermId.get(normalizePhaseSlug(t.task_status_slug)) ?? UNKNOWN_SORT_INDEX,
      assigneeSortKey: (t) => {
        const labels = (taskAssigneesMap[t.id] ?? [])
          .map((a) => a.label)
          .sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" }));
        return labels.join(", ").toLowerCase();
      },
      progressParts: (t) => {
        const estimated = t.planned_time ?? 0;
        const spent = taskTimeLogTotals[t.id] ?? 0;
        if (estimated <= 0) return { hasEstimate: false, pct: 0 };
        return { hasEstimate: true, pct: Math.round((spent / estimated) * 100) };
      },
    };
  }, [
    projectMap,
    taskPhaseOptions,
    taskTypeOptions,
    taskStatusOptions,
    taskTypeTerms,
    statusTerms,
    phaseSlugByTaskId,
    taskAssigneesMap,
    taskTimeLogTotals,
  ]);

  const sortedDisplayTasks = useMemo(
    () => sortAllTasksForDisplay(displayTasks, sortState, sortContext),
    [displayTasks, sortState, sortContext]
  );

  /** When sorting by Project, tasks are already ordered by phase → due → title within each project; split for visual group headers. */
  const projectSortGroups = useMemo(() => {
    if (sortState.column !== "project") return null;
    const list = sortedDisplayTasks;
    if (list.length === 0) return [];
    const groups: { projectId: string; tasks: Task[] }[] = [];
    let currentId = list[0].project_id ?? "";
    let bucket: Task[] = [list[0]];
    for (let i = 1; i < list.length; i++) {
      const t = list[i];
      const pid = t.project_id ?? "";
      if (pid === currentId) {
        bucket.push(t);
      } else {
        groups.push({ projectId: currentId, tasks: bucket });
        currentId = pid;
        bucket = [t];
      }
    }
    groups.push({ projectId: currentId, tasks: bucket });
    return groups;
  }, [sortState.column, sortedDisplayTasks]);

  const hasActiveFilters =
    selectedProjectIds.size > 0 ||
    selectedAssigneeUserIds.size > 0 ||
    selectedAssigneeContactIds.size > 0 ||
    selectedPhaseSlugs.size > 0 ||
    selectedTaskTypeSlug != null ||
    selectedTaskStatusSlug != null;

  const hasNonDefaultSort = useMemo(
    () =>
      sortState.column !== DEFAULT_ALL_TASKS_SORT.column ||
      sortState.direction !== DEFAULT_ALL_TASKS_SORT.direction,
    [sortState.column, sortState.direction]
  );

  /**
   * Master reset → recap (`none` preset: include completed). Enabled when not already at that baseline
   * or when filters / search / sort differ from default.
   */
  const hasAnythingToReset =
    hasActiveFilters ||
    titleSearchQuery.trim().length > 0 ||
    tasksPreset !== RECAP_RESET_PRESET ||
    hasNonDefaultSort;

  /** Modal dimensions only (title search is separate — does not light the funnel). */
  const customFilterDimensionsActive = useMemo(() => {
    let n = 0;
    if (selectedProjectIds.size > 0) n++;
    if (selectedAssigneeUserIds.size + selectedAssigneeContactIds.size > 0) n++;
    if (selectedPhaseSlugs.size > 0) n++;
    if (selectedTaskTypeSlug != null) n++;
    if (selectedTaskStatusSlug != null) n++;
    return n;
  }, [
    selectedProjectIds,
    selectedAssigneeUserIds,
    selectedAssigneeContactIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
  ]);

  const loadTasksFromQuery = useCallback(async (queryString: string) => {
    setLoading(true);
    try {
      const url = queryString ? `/api/tasks?${queryString}` : "/api/tasks";
      const res = await fetch(url, { cache: "no-store" });
      const data: unknown = await res.json();
      if (!res.ok || !isAdminTasksBundle(data)) {
        return;
      }
      setTasks(data.tasks);
      setTaskAssigneesMap(data.taskAssigneesMap);
      setTaskTimeLogTotals(data.taskTimeLogTotals);
      setPhaseSlugByTaskId(data.phaseSlugByTaskId);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyAllActivePreset = useCallback(async () => {
    setTasksPreset("all_active");
    setSortState(PRESET_FLAT_DUE_SORT);
    const emptyUsers = new Set<string>();
    const emptyContacts = new Set<string>();
    setSelectedAssigneeUserIds(emptyUsers);
    setSelectedAssigneeContactIds(emptyContacts);
    const qs = buildTasksQuery(
      selectedProjectIds,
      emptyUsers,
      emptyContacts,
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug,
      "all_active"
    );
    await loadTasksFromQuery(qs);
  }, [
    selectedProjectIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
    loadTasksFromQuery,
  ]);

  const applyMyTasksPreset = useCallback(async () => {
    if (!currentUserId) return;
    setTasksPreset("my_tasks");
    setSortState(PRESET_FLAT_DUE_SORT);
    const nextU = new Set([currentUserId]);
    setSelectedAssigneeUserIds(nextU);
    setSelectedAssigneeContactIds(new Set());
    const qs = buildTasksQuery(
      selectedProjectIds,
      nextU,
      new Set(),
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug,
      "my_tasks"
    );
    await loadTasksFromQuery(qs);
  }, [
    currentUserId,
    selectedProjectIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
    loadTasksFromQuery,
  ]);

  const applyOverduePreset = useCallback(async () => {
    setTasksPreset("overdue");
    setSortState(PRESET_FLAT_DUE_SORT);
    /** Do not AND with prior assignee selection (e.g. after **My tasks**) — overdue means all overdue in scope. */
    const emptyUsers = new Set<string>();
    const emptyContacts = new Set<string>();
    setSelectedAssigneeUserIds(emptyUsers);
    setSelectedAssigneeContactIds(emptyContacts);
    const qs = buildTasksQuery(
      selectedProjectIds,
      emptyUsers,
      emptyContacts,
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug,
      "overdue"
    );
    await loadTasksFromQuery(qs);
  }, [
    selectedProjectIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
    loadTasksFromQuery,
  ]);

  /** Column sort clears preset **and** refetches without preset RPC flags (exclude / due_before). */
  const onToggleSort = useCallback(
    (column: AllTasksSortColumn) => {
      setTasksPreset("none");
      setSortState((s) => toggleAllTasksSort(s, column));
      const qs = buildTasksQuery(
        selectedProjectIds,
        selectedAssigneeUserIds,
        selectedAssigneeContactIds,
        selectedPhaseSlugs,
        selectedTaskTypeSlug,
        selectedTaskStatusSlug,
        "none"
      );
      void loadTasksFromQuery(qs);
    },
    [
      selectedProjectIds,
      selectedAssigneeUserIds,
      selectedAssigneeContactIds,
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug,
      loadTasksFromQuery,
    ]
  );

  const openCustomFilters = useCallback(() => {
    setProjectDraftIds(new Set(selectedProjectIds));
    setAssigneeDraftUserIds(new Set(selectedAssigneeUserIds));
    setAssigneeDraftContactIds(new Set(selectedAssigneeContactIds));
    setPhaseDraftSlugs(new Set(selectedPhaseSlugs));
    setDraftTaskTypeSlug(selectedTaskTypeSlug);
    setDraftTaskStatusSlug(selectedTaskStatusSlug);
    setProjectSearch("");
    setAssigneeSearch("");
    setPhaseSearch("");
    setCustomFiltersOpen(true);
  }, [
    selectedProjectIds,
    selectedAssigneeUserIds,
    selectedAssigneeContactIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
  ]);

  const applyCustomFilters = useCallback(async () => {
    const newProj = new Set(projectDraftIds);
    setSelectedProjectIds(newProj);

    const scopeIds = scopeProjectIdsForMembers(newProj, pickerProjects);
    const { users: allowedU, contacts: allowedC } = collectAssigneeIdsForProjects(
      scopeIds,
      membersByProject
    );
    const nextU = new Set([...assigneeDraftUserIds].filter((id) => allowedU.has(id)));
    const nextC = new Set([...assigneeDraftContactIds].filter((id) => allowedC.has(id)));
    setSelectedAssigneeUserIds(nextU);
    setSelectedAssigneeContactIds(nextC);

    const allowedPhases = new Set(taskPhaseOptions.map((o) => normalizePhaseSlug(o.slug)));
    const nextPhase = new Set([...phaseDraftSlugs].filter((s) => allowedPhases.has(s)));
    setSelectedPhaseSlugs(nextPhase);

    const nextType =
      draftTaskTypeSlug != null && String(draftTaskTypeSlug).trim() !== ""
        ? draftTaskTypeSlug.trim().toLowerCase()
        : null;
    const nextStatus =
      draftTaskStatusSlug != null && String(draftTaskStatusSlug).trim() !== ""
        ? draftTaskStatusSlug.trim().toLowerCase()
        : null;
    setSelectedTaskTypeSlug(nextType);
    setSelectedTaskStatusSlug(nextStatus);

    let presetForQuery = tasksPreset;
    if (tasksPreset === "my_tasks") {
      const onlyMe =
        currentUserId !== "" &&
        nextU.size === 1 &&
        nextU.has(currentUserId) &&
        nextC.size === 0;
      if (!onlyMe) presetForQuery = "all_active";
    }

    const qs = buildTasksQuery(newProj, nextU, nextC, nextPhase, nextType, nextStatus, presetForQuery);
    await loadTasksFromQuery(qs);
    setTasksPreset(presetForQuery);
    setCustomFiltersOpen(false);
  }, [
    projectDraftIds,
    pickerProjects,
    membersByProject,
    assigneeDraftUserIds,
    assigneeDraftContactIds,
    phaseDraftSlugs,
    taskPhaseOptions,
    draftTaskTypeSlug,
    draftTaskStatusSlug,
    tasksPreset,
    currentUserId,
    loadTasksFromQuery,
  ]);

  const resetAllFilters = useCallback(async () => {
    setSelectedProjectIds(new Set());
    setSelectedAssigneeUserIds(new Set());
    setSelectedAssigneeContactIds(new Set());
    setSelectedPhaseSlugs(new Set());
    setSelectedTaskTypeSlug(null);
    setSelectedTaskStatusSlug(null);
    setTitleSearchQuery("");
    /** Recap: `none` = no preset highlight + no `exclude_status_slugs` (includes completed). */
    setTasksPreset(RECAP_RESET_PRESET);
    setSortState(DEFAULT_ALL_TASKS_SORT);
    const qs = buildTasksQuery(
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      null,
      null,
      RECAP_RESET_PRESET
    );
    await loadTasksFromQuery(qs);
  }, [loadTasksFromQuery]);

  const openCreateTask = useCallback(() => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateProjectId(null);
    setCreateError(null);
    setCreateOpen(true);
  }, []);

  const createTaskFromDialog = useCallback(async () => {
    const title = createTitle.trim();
    if (!title) {
      setCreateError("Title is required.");
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: createDescription.trim() || null,
          project_id: createProjectId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.id !== "string") {
        setCreateError(typeof data?.error === "string" ? data.error : "Failed to create task.");
        return;
      }
      const newTaskId = data.id as string;
      router.push(taskDetailPath(newTaskId, createProjectId, "tasks"));
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setCreateSubmitting(false);
    }
  }, [createTitle, createDescription, createProjectId, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">All Tasks</h1>

      {/*
        Toolbar (sessionlog §1.1): single row — title search | §1.3 preset slot | Custom filters + reset.
        Search = ALL_TASKS_TOOLBAR_SEARCH (contrast-tuned toolbar field).
      */}
      <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-2">
        <div className={ALL_TASKS_TOOLBAR_SEARCH.wrapper}>
          <Search className={ALL_TASKS_TOOLBAR_SEARCH.icon} aria-hidden />
          <Input
            className={ALL_TASKS_TOOLBAR_SEARCH.input}
            placeholder="Search titles…"
            value={titleSearchQuery}
            onChange={(e) => setTitleSearchQuery(e.target.value)}
            disabled={loading}
            aria-label="Filter tasks by title"
            title="Filters the table as you type (current results only)"
          />
        </div>

        <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center justify-center gap-1">
          <Button
            type="button"
            variant={tasksPreset === "all_active" ? "secondary" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={loading}
            aria-pressed={tasksPreset === "all_active"}
            onClick={() => void applyAllActivePreset()}
            title="All incomplete tasks (Customizer status “completed” excluded). Tasks on archived projects are excluded (server). Sorted by due date, then title. Clears assignee filter; refine with Filters or search."
          >
            All Active
          </Button>
          <Button
            type="button"
            variant={tasksPreset === "my_tasks" ? "secondary" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={loading || !currentUserId}
            aria-pressed={tasksPreset === "my_tasks"}
            onClick={() => void applyMyTasksPreset()}
            title={
              !currentUserId
                ? "Sign in required"
                : "Your tasks (team assignee via user id); excludes completed. Refine with Filters or search."
            }
          >
            My tasks
          </Button>
          <Button
            type="button"
            variant={tasksPreset === "overdue" ? "secondary" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={loading}
            aria-pressed={tasksPreset === "overdue"}
            onClick={() => void applyOverduePreset()}
            title="Incomplete tasks with due date before today (local calendar); status “completed” excluded. Clears assignee filter (e.g. after My tasks). Refine with Filters or search."
          >
            Overdue
          </Button>
        </div>

        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1 md:flex-nowrap">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={openCreateTask}
            disabled={loading}
            title="Create a new task (project optional)"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add task
          </Button>
          <Button
            type="button"
            variant={customFilterDimensionsActive > 0 ? "secondary" : "outline"}
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={openCustomFilters}
            disabled={loading}
            aria-label="Custom filters"
            aria-expanded={customFiltersOpen}
            aria-haspopup="dialog"
            aria-pressed={customFilterDimensionsActive > 0}
            title="Projects, assignees, phase, type, and status"
          >
            <Filter className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span>Filters</span>
            {customFilterDimensionsActive > 0 ? (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 tabular-nums">
                {customFilterDimensionsActive}
              </Badge>
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void resetAllFilters()}
            disabled={loading || !hasAnythingToReset}
            aria-label="Reset to full recap: all tasks except archived projects, sorted by due date then title"
            title="Recap view: clear filters and presets; show all tasks (including completed) except archived projects; sort due date then title"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="min-w-0 overflow-x-hidden">
            <table className="w-full table-fixed caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <AllTasksSortColumnHeader
                    column="title"
                    label="Title"
                    colClass={ALL_TASKS_TABLE_COL.title}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                  />
                  <AllTasksSortColumnHeader
                    column="project"
                    label="Project"
                    colClass={ALL_TASKS_TABLE_COL.project}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                    title="Grouped by project; under each project: phase order, then due date, then title. Click Project to reverse project order."
                  />
                  <AllTasksSortColumnHeader
                    column="assignee"
                    label="Assignee"
                    colClass={ALL_TASKS_TABLE_COL.assignee}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                  />
                  <AllTasksSortColumnHeader
                    column="phase"
                    label="Phase"
                    colClass={ALL_TASKS_TABLE_COL.phase}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                  />
                  <AllTasksSortColumnHeader
                    column="type"
                    label="Type"
                    colClass={ALL_TASKS_TABLE_COL.type}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                  />
                  <AllTasksSortColumnHeader
                    column="dueDate"
                    label="Due Date"
                    colClass={ALL_TASKS_TABLE_COL.dueDate}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                    title="Ascending: earliest due first; no due date last. Same calendar due: title A→Z, then task number."
                  />
                  <AllTasksSortColumnHeader
                    column="progress"
                    label="Progress"
                    colClass={ALL_TASKS_TABLE_COL.progress}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                  />
                  <AllTasksSortColumnHeader
                    column="status"
                    label="Status"
                    colClass={ALL_TASKS_TABLE_COL.status}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No tasks.
                    </td>
                  </tr>
                ) : displayTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No tasks match &ldquo;{titleSearchQuery.trim()}&rdquo;. Try different text or clear the title
                      search field.
                    </td>
                  </tr>
                ) : projectSortGroups != null ? (
                  projectSortGroups.map((g) => (
                    <Fragment key={g.projectId || "__none__"}>
                      <tr className="border-t-2 border-border bg-muted/50">
                        <th
                          colSpan={8}
                          scope="colgroup"
                          className="px-4 py-2 text-left align-middle text-sm font-semibold text-foreground"
                        >
                          {g.projectId ? (
                            <Link
                              href={`/admin/projects/${g.projectId}`}
                              className="hover:underline"
                            >
                              {projectMap.get(g.projectId) ?? g.projectId.slice(0, 8) + "…"}
                            </Link>
                          ) : (
                            <span>No project</span>
                          )}
                          <span className="ml-2 font-normal text-muted-foreground">
                            ({g.tasks.length} {g.tasks.length === 1 ? "task" : "tasks"})
                          </span>
                        </th>
                      </tr>
                      {g.tasks.map((t) => (
                        <AllTasksTableDataRow
                          key={t.id}
                          t={t}
                          phaseSlugByTaskId={phaseSlugByTaskId}
                          taskPhaseTerms={taskPhaseTerms}
                          taskTypeTerms={taskTypeTerms}
                          statusTerms={statusTerms}
                          projectMap={projectMap}
                          taskAssigneesMap={taskAssigneesMap}
                          taskTimeLogTotals={taskTimeLogTotals}
                        />
                      ))}
                    </Fragment>
                  ))
                ) : (
                  sortedDisplayTasks.map((t) => (
                    <AllTasksTableDataRow
                      key={t.id}
                      t={t}
                      phaseSlugByTaskId={phaseSlugByTaskId}
                      taskPhaseTerms={taskPhaseTerms}
                      taskTypeTerms={taskTypeTerms}
                      statusTerms={statusTerms}
                      projectMap={projectMap}
                      taskAssigneesMap={taskAssigneesMap}
                      taskTimeLogTotals={taskTimeLogTotals}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={customFiltersOpen} onOpenChange={setCustomFiltersOpen}>
        <DialogContent className="flex max-h-[min(92vh,42rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 text-left">
            <DialogTitle>Custom filters</DialogTitle>
            <DialogDescription>
              Narrow the task list. <strong>Apply</strong> loads tasks from the server (same query params as
              before). <strong>My tasks</strong> / <strong>Overdue</strong> in the toolbar stack with these
              filters. Title search stays in the toolbar and filters the current rows only. Tasks on{" "}
              <strong>archived</strong> projects are excluded (server-side).
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-4">
            <section className="space-y-3" aria-labelledby="all-tasks-filters-projects-heading">
              <h3 id="all-tasks-filters-projects-heading" className="text-sm font-semibold tracking-tight">
                Projects
              </h3>
              <p className="text-xs text-muted-foreground">
                Active projects only (excludes archived and completed or closed statuses). Clear selection to
                include all listed projects.
              </p>
              <Input
                placeholder="Search projects…"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                aria-label="Search projects"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading || sortedPickerProjects.length === 0}
                  onClick={() => setProjectDraftIds(new Set(sortedPickerProjects.map((p) => p.id)))}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => setProjectDraftIds(new Set())}
                >
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {sortedPickerProjects.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No active projects.</p>
                ) : filteredProjects.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredProjects.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
                          <Checkbox
                            checked={projectDraftIds.has(p.id)}
                            onCheckedChange={(checked) => {
                              setProjectDraftIds((prev) => {
                                const next = new Set(prev);
                                if (checked === true) next.add(p.id);
                                else next.delete(p.id);
                                return next;
                              });
                            }}
                            aria-label={p.name}
                          />
                          <span className="min-w-0 flex-1 text-sm">{p.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="all-tasks-filters-assignees-heading">
              <h3 id="all-tasks-filters-assignees-heading" className="text-sm font-semibold tracking-tight">
                Assignees
              </h3>
              <p className="text-xs text-muted-foreground">
                Project members (team or clients) from{" "}
                {projectDraftIds.size === 0
                  ? "all active projects in the list above"
                  : projectDraftIds.size === 1
                    ? "the selected project"
                    : "the projects selected above"}
                . Changing <strong>Projects</strong> updates who appears here. Apply removes assignees outside
                the new project scope.
              </p>
              <Input
                placeholder="Search assignees…"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                aria-label="Search assignees"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading || assigneeOptions.length === 0}
                  onClick={() => {
                    const u = new Set<string>();
                    const c = new Set<string>();
                    for (const o of assigneeOptions) {
                      if (o.kind === "user") u.add(o.id);
                      else c.add(o.id);
                    }
                    setAssigneeDraftUserIds(u);
                    setAssigneeDraftContactIds(c);
                  }}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => {
                    setAssigneeDraftUserIds(new Set());
                    setAssigneeDraftContactIds(new Set());
                  }}
                >
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {assigneeOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No project members in the current scope.
                  </p>
                ) : filteredAssignees.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredAssignees.map((o) => {
                      const checked =
                        o.kind === "user"
                          ? assigneeDraftUserIds.has(o.id)
                          : assigneeDraftContactIds.has(o.id);
                      return (
                        <li key={`${o.kind}:${o.id}`}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(ch) => {
                                if (o.kind === "user") {
                                  setAssigneeDraftUserIds((prev) => {
                                    const next = new Set(prev);
                                    if (ch === true) next.add(o.id);
                                    else next.delete(o.id);
                                    return next;
                                  });
                                } else {
                                  setAssigneeDraftContactIds((prev) => {
                                    const next = new Set(prev);
                                    if (ch === true) next.add(o.id);
                                    else next.delete(o.id);
                                    return next;
                                  });
                                }
                              }}
                              aria-label={o.label}
                            />
                            <span className="min-w-0 flex-1 text-sm">{o.label}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {o.kind === "user" ? "Team" : "Client"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="all-tasks-filters-phase-heading">
              <h3 id="all-tasks-filters-phase-heading" className="text-sm font-semibold tracking-tight">
                Phase
              </h3>
              <p className="text-xs text-muted-foreground">
                From <strong>Settings → Customizer → Task phases</strong>. Clear to include all phases.
              </p>
              <Input
                placeholder="Search phases…"
                value={phaseSearch}
                onChange={(e) => setPhaseSearch(e.target.value)}
                aria-label="Search phases"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading || taskPhaseOptions.length === 0}
                  onClick={() =>
                    setPhaseDraftSlugs(new Set(taskPhaseOptions.map((o) => normalizePhaseSlug(o.slug))))
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => setPhaseDraftSlugs(new Set())}
                >
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {taskPhaseOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No task phases in Customizer. Add rows under scope{" "}
                    <code className="text-xs">task_phase</code>.
                  </p>
                ) : filteredPhaseOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredPhaseOptions.map((o) => {
                      const key = normalizePhaseSlug(o.slug);
                      return (
                        <li key={key}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
                            <Checkbox
                              checked={phaseDraftSlugs.has(key)}
                              onCheckedChange={(ch) => {
                                setPhaseDraftSlugs((prev) => {
                                  const next = new Set(prev);
                                  if (ch === true) next.add(key);
                                  else next.delete(key);
                                  return next;
                                });
                              }}
                              aria-label={o.label}
                            />
                            <PhaseDot color={o.color} />
                            <span className="min-w-0 flex-1 text-sm">{o.label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="all-tasks-filters-type-heading">
              <h3 id="all-tasks-filters-type-heading" className="text-sm font-semibold tracking-tight">
                Type
              </h3>
              <Select
                value={draftTaskTypeSlug ?? TASK_TYPE_SELECT_ALL}
                onValueChange={(v) =>
                  setDraftTaskTypeSlug(v === TASK_TYPE_SELECT_ALL ? null : v)
                }
                disabled={loading || taskTypeOptions.length === 0}
              >
                <SelectTrigger
                  className="h-9 w-full text-xs"
                  aria-label="Filter by task type"
                >
                  <SelectValue
                    placeholder={
                      taskTypeOptions.length === 0 ? "No task types in Customizer" : "Task type"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TASK_TYPE_SELECT_ALL}>
                    <span className="font-normal">All types</span>
                  </SelectItem>
                  {taskTypeOptions.map((o) => {
                    const v = normalizePhaseSlug(o.slug);
                    return (
                      <SelectItem key={v} value={v}>
                        <span className="flex items-center gap-2">
                          <PhaseDot color={o.color} />
                          {o.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </section>

            <section className="space-y-3" aria-labelledby="all-tasks-filters-status-heading">
              <h3 id="all-tasks-filters-status-heading" className="text-sm font-semibold tracking-tight">
                Status
              </h3>
              <Select
                value={draftTaskStatusSlug ?? TASK_STATUS_SELECT_ALL}
                onValueChange={(v) =>
                  setDraftTaskStatusSlug(v === TASK_STATUS_SELECT_ALL ? null : v)
                }
                disabled={loading || taskStatusOptions.length === 0}
              >
                <SelectTrigger
                  className="h-9 w-full text-xs"
                  aria-label="Filter by task status"
                >
                  <SelectValue
                    placeholder={
                      taskStatusOptions.length === 0
                        ? "No statuses in Customizer"
                        : "Task status"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TASK_STATUS_SELECT_ALL}>
                    <span className="font-normal">All statuses</span>
                  </SelectItem>
                  {taskStatusOptions.map((o) => {
                    const v = normalizePhaseSlug(o.slug);
                    return (
                      <SelectItem key={v} value={v}>
                        <span className="flex items-center gap-2">
                          <PhaseDot color={o.color} />
                          {o.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </section>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomFiltersOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyCustomFilters()} disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
            <DialogDescription>
              Create a task for day-to-day operations. Project is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="all-tasks-create-title" className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                id="all-tasks-create-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Task title"
                disabled={createSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="all-tasks-create-project" className="text-xs font-medium text-muted-foreground">
                Project
              </label>
              <Select
                value={createProjectId ?? NO_PROJECT_SELECT_VALUE}
                onValueChange={(v) =>
                  setCreateProjectId(v === NO_PROJECT_SELECT_VALUE ? null : v)
                }
                disabled={createSubmitting}
              >
                <SelectTrigger id="all-tasks-create-project">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_SELECT_VALUE}>No project</SelectItem>
                  {pickerProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="all-tasks-create-description"
                className="text-xs font-medium text-muted-foreground"
              >
                Description (optional)
              </label>
              <Input
                id="all-tasks-create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Optional"
                disabled={createSubmitting}
              />
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void createTaskFromDialog()} disabled={createSubmitting}>
              {createSubmitting ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
