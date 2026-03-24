"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectListTable, type ProjectListRow, type ProjectListTerm } from "@/components/projects/ProjectListTable";

/**
 * Toolbar search — match All Tasks (`AllTasksListClient`) contrast so the field reads clearly on the page.
 */
const PROJECTS_TOOLBAR_SEARCH = {
  wrapper: "relative w-full min-w-0 md:min-w-[7rem] md:flex-1",
  icon: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/55 dark:text-foreground/50",
  input:
    "h-8 w-full min-w-0 border-2 border-border bg-card pl-7 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-ring",
} as const;

interface ProjectsListClientProps {
  initialRows: ProjectListRow[];
  statusTerms: ProjectListTerm[];
}

export function ProjectsListClient({ initialRows, statusTerms }: ProjectsListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTermId, setStatusTermId] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialRows.filter((project) => {
      if (!includeArchived && project.archivedAt) return false;
      if (statusTermId && project.statusTerm?.id !== statusTermId) return false;
      if (q) {
        const name = (project.name ?? "").toLowerCase();
        const client = (project.client?.label ?? "").toLowerCase();
        if (!name.includes(q) && !client.includes(q)) return false;
      }
      return true;
    });
  }, [initialRows, includeArchived, statusTermId, searchQuery]);

  const hasList = initialRows.length > 0;
  const emptyAfterFilter = hasList && filteredRows.length === 0;

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

      <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-2">
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

        <div className="flex min-h-8 min-w-0 shrink-0 flex-wrap items-center justify-end gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="projects-list-status" className="text-xs text-muted-foreground whitespace-nowrap">
              Status
            </Label>
            <Select
              value={statusTermId || "all"}
              onValueChange={(v) => setStatusTermId(v === "all" ? "" : v)}
            >
              <SelectTrigger id="projects-list-status" className="h-8 w-[min(12rem,100%)] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="projects-include-archived"
              checked={includeArchived}
              onCheckedChange={(v) => setIncludeArchived(v === true)}
            />
            <Label htmlFor="projects-include-archived" className="cursor-pointer text-xs font-normal">
              Include archived
            </Label>
          </div>
        </div>
      </div>

      {emptyAfterFilter ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No projects match your search or filters. Try different text or clear Status / archived options.
        </div>
      ) : (
        <ProjectListTable projects={filteredRows} />
      )}
    </div>
  );
}
