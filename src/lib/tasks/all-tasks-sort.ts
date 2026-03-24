/**
 * Client-side sort for admin All Tasks table (sessionlog §1.2).
 * Applied after title search on the loaded task list.
 */

import type { Task } from "@/lib/supabase/projects";

export type AllTasksSortColumn =
  | "title"
  | "project"
  | "assignee"
  | "phase"
  | "type"
  | "dueDate"
  | "progress"
  | "status";

export type AllTasksSortDirection = "asc" | "desc";

export type AllTasksSortState = {
  column: AllTasksSortColumn;
  direction: AllTasksSortDirection;
};

/** Default landing: due date ascending (nulls last); same due date → title, then task number. */
export const DEFAULT_ALL_TASKS_SORT: AllTasksSortState = {
  column: "dueDate",
  direction: "asc",
};

/** §1.3 presets (All Active, My tasks, Overdue): same flat due order as default landing. */
export const PRESET_FLAT_DUE_SORT: AllTasksSortState = DEFAULT_ALL_TASKS_SORT;

const UNKNOWN_INDEX = 999_999;

export function toggleAllTasksSort(
  current: AllTasksSortState,
  column: AllTasksSortColumn
): AllTasksSortState {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: "asc" };
}

export interface AllTasksSortContext {
  projectName: (task: Task) => string;
  /** Customizer phase order; unknown slugs → UNKNOWN_INDEX */
  phaseIndex: (task: Task) => number;
  /** Customizer task_type order by taxonomy term id */
  typeIndex: (task: Task) => number;
  /** Customizer task_status order by taxonomy term id */
  statusIndex: (task: Task) => number;
  /** Lexicographic join of assignee labels (sorted), lowercase for compare */
  assigneeSortKey: (task: Task) => string;
  /** Matches Progress cell: no estimate → sort after rows with estimate when ascending */
  progressParts: (task: Task) => { hasEstimate: boolean; pct: number };
}

function compareStr(a: string, b: string, dir: AllTasksSortDirection): number {
  const c = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? c : -c;
}

/** YYYY-MM-DD; nulls always last (both directions). */
function compareDueDateColumn(
  d1: string | null,
  d2: string | null,
  dir: AllTasksSortDirection
): number {
  if (d1 == null && d2 == null) return 0;
  if (d1 == null) return 1;
  if (d2 == null) return -1;
  const c = d1.localeCompare(d2);
  return dir === "asc" ? c : -c;
}

/** Within project group: due ascending, nulls last */
function compareDueDateWithinProject(d1: string | null, d2: string | null): number {
  if (d1 == null && d2 == null) return 0;
  if (d1 == null) return 1;
  if (d2 == null) return -1;
  return d1.localeCompare(d2);
}

function compareTitleThenNumber(a: Task, b: Task, dir: AllTasksSortDirection): number {
  const t = compareStr((a.title ?? "").toLowerCase(), (b.title ?? "").toLowerCase(), dir);
  if (t !== 0) return t;
  return compareStr(
    (a.task_number ?? "").toLowerCase(),
    (b.task_number ?? "").toLowerCase(),
    dir
  );
}

/** Known indices sort by direction; unknown (UNKNOWN_INDEX) always last */
function compareCustomizerIndex(
  ia: number,
  ib: number,
  dir: AllTasksSortDirection
): number {
  const aUn = ia >= UNKNOWN_INDEX;
  const bUn = ib >= UNKNOWN_INDEX;
  if (aUn && bUn) return 0;
  if (aUn) return 1;
  if (bUn) return -1;
  const c = ia - ib;
  return dir === "asc" ? c : -c;
}

function compareProjectComposite(
  a: Task,
  b: Task,
  ctx: AllTasksSortContext,
  projectDir: AllTasksSortDirection
): number {
  const nameA = ctx.projectName(a);
  const nameB = ctx.projectName(b);
  const primary = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  if (primary !== 0) return projectDir === "asc" ? primary : -primary;

  const ph = ctx.phaseIndex(a) - ctx.phaseIndex(b);
  if (ph !== 0) return ph;

  const due = compareDueDateWithinProject(a.due_date, b.due_date);
  if (due !== 0) return due;

  return compareTitleThenNumber(a, b, "asc");
}

function compareProgress(
  a: Task,
  b: Task,
  ctx: AllTasksSortContext,
  dir: AllTasksSortDirection
): number {
  const pa = ctx.progressParts(a);
  const pb = ctx.progressParts(b);
  if (!pa.hasEstimate && !pb.hasEstimate) return 0;
  if (!pa.hasEstimate && pb.hasEstimate) return 1;
  if (pa.hasEstimate && !pb.hasEstimate) return -1;
  const c = pa.pct - pb.pct;
  return dir === "asc" ? c : -c;
}

function comparePair(
  a: Task,
  b: Task,
  state: AllTasksSortState,
  ctx: AllTasksSortContext
): number {
  const { column, direction } = state;

  switch (column) {
    case "project":
      return compareProjectComposite(a, b, ctx, direction);
    case "title":
      return compareTitleThenNumber(a, b, direction);
    case "assignee":
      return compareStr(ctx.assigneeSortKey(a), ctx.assigneeSortKey(b), direction);
    case "phase":
      return compareCustomizerIndex(ctx.phaseIndex(a), ctx.phaseIndex(b), direction);
    case "type":
      return compareCustomizerIndex(ctx.typeIndex(a), ctx.typeIndex(b), direction);
    case "status":
      return compareCustomizerIndex(ctx.statusIndex(a), ctx.statusIndex(b), direction);
    case "dueDate": {
      const d = compareDueDateColumn(a.due_date, b.due_date, direction);
      if (d !== 0) return d;
      return compareTitleThenNumber(a, b, "asc");
    }
    case "progress":
      return compareProgress(a, b, ctx, direction);
    default:
      return 0;
  }
}

export function sortAllTasksForDisplay(
  tasks: Task[],
  state: AllTasksSortState,
  ctx: AllTasksSortContext
): Task[] {
  const out = [...tasks];
  out.sort((a, b) => {
    const c = comparePair(a, b, state, ctx);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
  return out;
}
