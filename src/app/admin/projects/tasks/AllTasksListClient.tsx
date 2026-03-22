"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
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
import { taskTermForSlug } from "@/lib/tasks/merge-task-customizer-colors";
import { taskDetailQuery } from "@/lib/tasks/task-detail-nav";

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

/**
 * LOCKED — All Tasks toolbar search (do not change without explicit design review).
 */
const ALL_TASKS_TOOLBAR_SEARCH = {
  wrapper: "relative w-full min-w-0 md:min-w-[7rem] md:flex-1",
  icon: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground",
  input: "h-8 w-full min-w-0 pl-7 text-xs",
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

const ALL_TASKS_TABLE_TH = "h-9 px-4 text-left font-medium";
const ALL_TASKS_TABLE_TD = "p-3 align-top min-w-0";

function buildTasksQuery(
  projectIds: Set<string>,
  assigneeUserIds: Set<string>,
  assigneeContactIds: Set<string>,
  phaseSlugs: Set<string>,
  taskTypeSlug: string | null,
  taskStatusSlug: string | null
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

function TaskAssigneeAvatars({ assignees }: { assignees: TaskAssigneeItem[] }) {
  const max = 3;
  const visible = assignees.slice(0, max);
  const overflow = assignees.length - visible.length;
  function initials(label: string) {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    return label.slice(0, 2).toUpperCase() || "?";
  }
  if (visible.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-0.5">
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
              initials(a.label)
            )}
          </span>
        ))}
      </div>
      {overflow > 0 && <span className="ml-1 text-xs text-muted-foreground">+</span>}
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
}: AllTasksListClientProps) {
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

  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectDraftIds, setProjectDraftIds] = useState<Set<string>>(() => new Set());
  const [projectSearch, setProjectSearch] = useState("");

  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneeDraftUserIds, setAssigneeDraftUserIds] = useState<Set<string>>(() => new Set());
  const [assigneeDraftContactIds, setAssigneeDraftContactIds] = useState<Set<string>>(() => new Set());
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [phasePickerOpen, setPhasePickerOpen] = useState(false);
  const [phaseDraftSlugs, setPhaseDraftSlugs] = useState<Set<string>>(() => new Set());
  const [phaseSearch, setPhaseSearch] = useState("");

  /** Title substring filter (client-side on current API result); updates as you type. */
  const [titleSearchQuery, setTitleSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);

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

  const assigneeOptions = useMemo((): AssigneeOption[] => {
    const ids = scopeProjectIdsForMembers(selectedProjectIds, pickerProjects);
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
    selectedProjectIds,
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

  const hasActiveFilters =
    selectedProjectIds.size > 0 ||
    selectedAssigneeUserIds.size > 0 ||
    selectedAssigneeContactIds.size > 0 ||
    selectedPhaseSlugs.size > 0 ||
    selectedTaskTypeSlug != null ||
    selectedTaskStatusSlug != null ||
    titleSearchQuery.trim().length > 0;

  const loadTasksFromQuery = useCallback(async (queryString: string) => {
    setLoading(true);
    try {
      const url = queryString ? `/api/tasks?${queryString}` : "/api/tasks";
      const res = await fetch(url);
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

  const openProjectPicker = useCallback(() => {
    setProjectDraftIds(new Set(selectedProjectIds));
    setProjectSearch("");
    setProjectPickerOpen(true);
  }, [selectedProjectIds]);

  const applyProjectPicker = useCallback(async () => {
    const newProj = new Set(projectDraftIds);
    setSelectedProjectIds(newProj);

    const scopeIds = scopeProjectIdsForMembers(newProj, pickerProjects);
    const { users: allowedU, contacts: allowedC } = collectAssigneeIdsForProjects(
      scopeIds,
      membersByProject
    );
    const nextU = new Set([...selectedAssigneeUserIds].filter((id) => allowedU.has(id)));
    const nextC = new Set([...selectedAssigneeContactIds].filter((id) => allowedC.has(id)));
    setSelectedAssigneeUserIds(nextU);
    setSelectedAssigneeContactIds(nextC);

    const qs = buildTasksQuery(
      newProj,
      nextU,
      nextC,
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug
    );
    await loadTasksFromQuery(qs);
    setProjectPickerOpen(false);
  }, [
    projectDraftIds,
    pickerProjects,
    membersByProject,
    selectedAssigneeUserIds,
    selectedAssigneeContactIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
    loadTasksFromQuery,
  ]);

  const openAssigneePicker = useCallback(() => {
    setAssigneeDraftUserIds(new Set(selectedAssigneeUserIds));
    setAssigneeDraftContactIds(new Set(selectedAssigneeContactIds));
    setAssigneeSearch("");
    setAssigneePickerOpen(true);
  }, [selectedAssigneeUserIds, selectedAssigneeContactIds]);

  const applyAssigneePicker = useCallback(async () => {
    const nextU = new Set(assigneeDraftUserIds);
    const nextC = new Set(assigneeDraftContactIds);
    setSelectedAssigneeUserIds(nextU);
    setSelectedAssigneeContactIds(nextC);
    const qs = buildTasksQuery(
      selectedProjectIds,
      nextU,
      nextC,
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug
    );
    await loadTasksFromQuery(qs);
    setAssigneePickerOpen(false);
  }, [
    assigneeDraftUserIds,
    assigneeDraftContactIds,
    selectedProjectIds,
    selectedPhaseSlugs,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
    loadTasksFromQuery,
  ]);

  const openPhasePicker = useCallback(() => {
    setPhaseDraftSlugs(new Set(selectedPhaseSlugs));
    setPhaseSearch("");
    setPhasePickerOpen(true);
  }, [selectedPhaseSlugs]);

  const applyPhasePicker = useCallback(async () => {
    const allowed = new Set(taskPhaseOptions.map((o) => normalizePhaseSlug(o.slug)));
    const next = new Set([...phaseDraftSlugs].filter((s) => allowed.has(s)));
    setSelectedPhaseSlugs(next);
    const qs = buildTasksQuery(
      selectedProjectIds,
      selectedAssigneeUserIds,
      selectedAssigneeContactIds,
      next,
      selectedTaskTypeSlug,
      selectedTaskStatusSlug
    );
    await loadTasksFromQuery(qs);
    setPhasePickerOpen(false);
  }, [
    phaseDraftSlugs,
    taskPhaseOptions,
    selectedProjectIds,
    selectedAssigneeUserIds,
    selectedAssigneeContactIds,
    selectedTaskTypeSlug,
    selectedTaskStatusSlug,
    loadTasksFromQuery,
  ]);

  const onTaskTypeChange = useCallback(
    async (value: string) => {
      const next = value === TASK_TYPE_SELECT_ALL ? null : value;
      setSelectedTaskTypeSlug(next);
      const qs = buildTasksQuery(
        selectedProjectIds,
        selectedAssigneeUserIds,
        selectedAssigneeContactIds,
        selectedPhaseSlugs,
        next,
        selectedTaskStatusSlug
      );
      await loadTasksFromQuery(qs);
    },
    [
      selectedProjectIds,
      selectedAssigneeUserIds,
      selectedAssigneeContactIds,
      selectedPhaseSlugs,
      selectedTaskStatusSlug,
      loadTasksFromQuery,
    ]
  );

  const onTaskStatusChange = useCallback(
    async (value: string) => {
      const next = value === TASK_STATUS_SELECT_ALL ? null : value;
      setSelectedTaskStatusSlug(next);
      const qs = buildTasksQuery(
        selectedProjectIds,
        selectedAssigneeUserIds,
        selectedAssigneeContactIds,
        selectedPhaseSlugs,
        selectedTaskTypeSlug,
        next
      );
      await loadTasksFromQuery(qs);
    },
    [
      selectedProjectIds,
      selectedAssigneeUserIds,
      selectedAssigneeContactIds,
      selectedPhaseSlugs,
      selectedTaskTypeSlug,
      loadTasksFromQuery,
    ]
  );

  const resetAllFilters = useCallback(async () => {
    setSelectedProjectIds(new Set());
    setSelectedAssigneeUserIds(new Set());
    setSelectedAssigneeContactIds(new Set());
    setSelectedPhaseSlugs(new Set());
    setSelectedTaskTypeSlug(null);
    setSelectedTaskStatusSlug(null);
    setTitleSearchQuery("");
    await loadTasksFromQuery("");
  }, [loadTasksFromQuery]);

  const projectButtonLabel =
    selectedProjectIds.size === 0
      ? "All projects"
      : selectedProjectIds.size === 1
        ? "1 project selected"
        : `${selectedProjectIds.size} projects selected`;

  const assigneePickCount = selectedAssigneeUserIds.size + selectedAssigneeContactIds.size;
  const assigneeButtonLabel =
    assigneePickCount === 0
      ? "All assignees"
      : assigneePickCount === 1
        ? "1 assignee selected"
        : `${assigneePickCount} assignees selected`;

  const phasePickCount = selectedPhaseSlugs.size;
  const phaseButtonLabel =
    phasePickCount === 0
      ? "All phases"
      : phasePickCount === 1
        ? "1 phase selected"
        : `${phasePickCount} phases selected`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">All Tasks</h1>

      {/*
        Toolbar: compact row; search = ALL_TASKS_TOOLBAR_SEARCH (locked constants).
      */}
      <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-1">
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

        <div className="flex min-w-0 flex-wrap items-center gap-1 md:flex-nowrap md:shrink-0 md:gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-[7rem] shrink-0 justify-between gap-0.5 px-1.5 text-xs sm:w-[7.25rem] sm:px-2"
            onClick={openProjectPicker}
            disabled={loading}
            aria-expanded={projectPickerOpen}
            aria-haspopup="dialog"
            title={projectButtonLabel}
          >
            <span className="min-w-0 truncate text-left">{projectButtonLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-[7rem] shrink-0 justify-between gap-0.5 px-1.5 text-xs sm:w-[7.25rem] sm:px-2"
            onClick={openAssigneePicker}
            disabled={loading || assigneeOptions.length === 0}
            aria-expanded={assigneePickerOpen}
            aria-haspopup="dialog"
            title={assigneeButtonLabel}
          >
            <span className="min-w-0 truncate text-left">{assigneeButtonLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-[7rem] shrink-0 justify-between gap-0.5 px-1.5 text-xs sm:w-[7.25rem] sm:px-2"
            onClick={openPhasePicker}
            disabled={loading || taskPhaseOptions.length === 0}
            aria-expanded={phasePickerOpen}
            aria-haspopup="dialog"
            title={phaseButtonLabel}
          >
            <span className="min-w-0 truncate text-left">{phaseButtonLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </Button>

          <Select
            value={selectedTaskTypeSlug ?? TASK_TYPE_SELECT_ALL}
            onValueChange={(v) => void onTaskTypeChange(v)}
            disabled={loading || taskTypeOptions.length === 0}
          >
            <SelectTrigger
              className="h-8 w-[10.75rem] shrink-0 text-xs sm:w-[11.25rem]"
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

          <Select
            value={selectedTaskStatusSlug ?? TASK_STATUS_SELECT_ALL}
            onValueChange={(v) => void onTaskStatusChange(v)}
            disabled={loading || taskStatusOptions.length === 0}
          >
            <SelectTrigger
              className="h-8 w-[10.75rem] shrink-0 text-xs sm:w-[11.25rem]"
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

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void resetAllFilters()}
            disabled={loading || !hasActiveFilters}
            aria-label="Reset all filters"
            title="Reset all filters"
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
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.title}`}>Title</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.project}`}>Project</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.assignee}`}>Assignee</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.phase}`}>Phase</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.type}`}>Type</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.dueDate}`}>Due Date</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.progress}`}>Progress</th>
                  <th className={`${ALL_TASKS_TABLE_TH} ${ALL_TASKS_TABLE_COL.status}`}>Status</th>
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
                ) : (
                  displayTasks.map((t) => {
                    const phaseTerm = taskTermForSlug(taskPhaseTerms, phaseSlugByTaskId[t.id] ?? null);
                    return (
                      <tr key={t.id} className="border-b hover:bg-muted/50">
                        <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.title}`}>
                          <Link
                            href={`/admin/projects/${t.project_id}/tasks/${t.id}${taskDetailQuery("tasks")}`}
                            className="block break-words font-semibold text-primary hover:underline"
                          >
                            {t.title}
                          </Link>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {t.task_number}
                          </div>
                        </td>
                        <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.project}`}>
                          <Link
                            href={`/admin/projects/${t.project_id}`}
                            className="block truncate text-primary hover:underline"
                            title={projectMap.get(t.project_id) ?? undefined}
                          >
                            {projectMap.get(t.project_id) ?? t.project_id.slice(0, 8) + "…"}
                          </Link>
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
                            <TermBadge
                              term={taskTypeTerms.find((s) => s.id === t.task_type_slug) ?? null}
                            />
                          </div>
                        </td>
                        <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.dueDate} text-muted-foreground`}>
                          {formatDate(t.due_date)}
                        </td>
                        <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.progress}`}>
                          {(() => {
                            const estimated = t.proposed_time ?? 0;
                            const spent = taskTimeLogTotals[t.id] ?? 0;
                            if (estimated <= 0) return <span className="text-muted-foreground">—</span>;
                            const pct = Math.round((spent / estimated) * 100);
                            return (
                              <span
                                className={
                                  pct <= 100 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                                }
                                title={`${spent} min / ${estimated} min`}
                              >
                                {pct}%
                              </span>
                            );
                          })()}
                        </td>
                        <td className={`${ALL_TASKS_TABLE_TD} ${ALL_TASKS_TABLE_COL.status}`}>
                          <div className="min-w-0 max-w-full">
                            <TermBadge term={statusTerms.find((s) => s.id === t.task_status_slug) ?? null} />
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

      <Dialog open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
        <DialogContent className="flex max-h-[min(90vh,36rem)] max-w-lg flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Projects</DialogTitle>
            <DialogDescription>
              Active projects only (excludes archived and completed or closed statuses). Choose one or more, or
              clear and save to show tasks from all projects.
            </DialogDescription>
          </DialogHeader>
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
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-2">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProjectPickerOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyProjectPicker()} disabled={loading}>
              {loading ? "Loading…" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assigneePickerOpen} onOpenChange={setAssigneePickerOpen}>
        <DialogContent className="flex max-h-[min(90vh,36rem)] max-w-lg flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Assignees</DialogTitle>
            <DialogDescription>
              Project members (team or clients) from{" "}
              {selectedProjectIds.size === 0
                ? "all active projects"
                : selectedProjectIds.size === 1
                  ? "the selected project"
                  : "the selected projects"}
              . Changing the project filter above updates who appears here; selections that are no longer in
              scope are cleared when you save projects.
            </DialogDescription>
          </DialogHeader>
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
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-2">
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssigneePickerOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyAssigneePicker()} disabled={loading}>
              {loading ? "Loading…" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={phasePickerOpen} onOpenChange={setPhasePickerOpen}>
        <DialogContent className="flex max-h-[min(90vh,36rem)] max-w-lg flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Task phases</DialogTitle>
            <DialogDescription>
              Options come from <strong>Settings → Customizer → Task phases</strong> (slug must match a task
              phase category in taxonomy). Select one or more, or clear to include all phases.
            </DialogDescription>
          </DialogHeader>
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
                setPhaseDraftSlugs(
                  new Set(taskPhaseOptions.map((o) => normalizePhaseSlug(o.slug)))
                )
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
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-2">
            {taskPhaseOptions.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No task phases in Customizer. Add rows under scope <code className="text-xs">task_phase</code>.
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPhasePickerOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyPhasePicker()} disabled={loading}>
              {loading ? "Loading…" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
