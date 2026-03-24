"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectListTable, type ProjectListRow } from "@/components/projects/ProjectListTable";
import type { ProjectStatusFilterOption } from "@/lib/supabase/projects";

/**
 * Toolbar search — match All Tasks (`AllTasksListClient`) contrast so the field reads clearly on the page.
 */
const PROJECTS_TOOLBAR_SEARCH = {
  wrapper: "relative w-full min-w-0 md:min-w-[7rem]",
  icon: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/55 dark:text-foreground/50",
  input:
    "h-8 w-full min-w-0 border-2 border-border bg-card pl-7 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-ring",
} as const;

export type ProjectsListPreset = "all_active" | "my_projects" | "overdue" | "archived";

interface ProjectsListClientProps {
  initialRows: ProjectListRow[];
  /** Customizer scope `project_status` (display_order); filter matches `row.statusTerm.slug`. */
  statusFilterOptions: ProjectStatusFilterOption[];
  currentUserId: string | null;
}

function normProjectStatusSlug(row: ProjectListRow): string {
  return (row.statusTerm?.slug ?? "").trim().toLowerCase();
}

/** Archived: `archived_at` set and/or status slug `archived` (Customizer / taxonomy). */
function isProjectArchived(row: ProjectListRow): boolean {
  if (row.archivedAt) return true;
  return normProjectStatusSlug(row) === "archived";
}

/** Terminal “complete” slugs — align with `completed` in Customizer seeds and `complete` in event-link exclusions. */
function isProjectCompleteStatus(row: ProjectListRow): boolean {
  const s = normProjectStatusSlug(row);
  return s === "completed" || s === "complete";
}

/**
 * Project due date (local calendar day) is strictly after “today” (local calendar day from current time).
 * Used for the Overdue preset: due date (local day) is after today's local calendar day.
 */
function isDueDateAfterToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const endDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return endDay > todayStart;
}

function passesPreset(
  row: ProjectListRow,
  preset: ProjectsListPreset,
  currentUserId: string | null
): boolean {
  switch (preset) {
    case "all_active":
      return !isProjectArchived(row);
    case "archived":
      return isProjectArchived(row);
    case "my_projects":
      if (!currentUserId) return false;
      if (isProjectArchived(row)) return false;
      return row.memberUserIds.includes(currentUserId);
    case "overdue":
      if (isProjectArchived(row)) return false;
      if (isProjectCompleteStatus(row)) return false;
      return isDueDateAfterToday(row.dueDate);
    default:
      return true;
  }
}

export function ProjectsListClient({
  initialRows,
  statusFilterOptions,
  currentUserId,
}: ProjectsListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusSlug, setStatusSlug] = useState<string>("");
  const [preset, setPreset] = useState<ProjectsListPreset>("all_active");

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialRows.filter((project) => {
      if (!passesPreset(project, preset, currentUserId)) return false;
      if (statusSlug) {
        const rowSlug = (project.statusTerm?.slug ?? "").trim().toLowerCase();
        if (rowSlug !== statusSlug) return false;
      }
      if (q) {
        const name = (project.name ?? "").toLowerCase();
        const client = (project.client?.label ?? "").toLowerCase();
        if (!name.includes(q) && !client.includes(q)) return false;
      }
      return true;
    });
  }, [initialRows, preset, currentUserId, statusSlug, searchQuery]);

  const hasList = initialRows.length > 0;
  const emptyAfterFilter = hasList && filteredRows.length === 0;

  const resetFilters = () => {
    setSearchQuery("");
    setStatusSlug("");
    setPreset("all_active");
  };

  /** Preset chips — same pattern as All Tasks toolbar (`AllTasksListClient`): outline when idle, secondary when active. */
  const presetBtn = (id: ProjectsListPreset, label: string, disabled?: boolean, title?: string) => (
    <Button
      key={id}
      type="button"
      variant={preset === id ? "secondary" : "outline"}
      size="sm"
      disabled={disabled}
      title={title}
      className="h-8 shrink-0 px-2 text-xs"
      aria-pressed={preset === id}
      onClick={() => setPreset(id)}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
        <Button size="sm" className="h-9 shrink-0 self-end sm:self-center" asChild>
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            New project
          </Link>
        </Button>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-x-3 md:gap-y-2">
        <div className={PROJECTS_TOOLBAR_SEARCH.wrapper}>
          <Search className={PROJECTS_TOOLBAR_SEARCH.icon} aria-hidden />
          <Input
            className={PROJECTS_TOOLBAR_SEARCH.input}
            placeholder="Search by project or client…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter projects by name or client"
            title="Filters the table as you type (current results only)"
          />
        </div>

        <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center justify-center gap-1">
          {presetBtn(
            "all_active",
            "All Active",
            false,
            "Projects that are not archived (no archived_at and status is not Archived)"
          )}
          {presetBtn(
            "my_projects",
            "My Projects",
            !currentUserId,
            !currentUserId
              ? "Sign in required"
              : "Projects you are a member of, not archived (status or archived date)"
          )}
          {presetBtn(
            "overdue",
            "Overdue",
            false,
            "Not archived, not completed, with due date after today (later than current date)"
          )}
          {presetBtn(
            "archived",
            "Archived",
            false,
            "Projects with archived_at set or status Archived"
          )}
        </div>

        <div className="flex min-h-8 flex-wrap items-center justify-end gap-2 md:min-w-0">
          <div className="flex items-center gap-2">
            <Label htmlFor="projects-list-status" className="text-xs text-muted-foreground whitespace-nowrap">
              Status
            </Label>
            <Select
              value={statusSlug || "all"}
              onValueChange={(v) => setStatusSlug(v === "all" ? "" : v)}
            >
              <SelectTrigger id="projects-list-status" className="h-8 w-[min(12rem,100%)] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusFilterOptions.map((opt) => (
                  <SelectItem key={opt.slug} value={opt.slug}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Reset search, status, and preset"
            title="Reset search, status filter, and preset to All Active"
            onClick={resetFilters}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {emptyAfterFilter ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No projects match your search or filters. Try different text, preset, or Status — or reset.
        </div>
      ) : (
        <ProjectListTable projects={filteredRows} />
      )}
    </div>
  );
}
