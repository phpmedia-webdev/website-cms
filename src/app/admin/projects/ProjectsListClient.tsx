"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { ProjectListTable, type ProjectListRow, type ProjectListTerm } from "@/components/projects/ProjectListTable";

interface ProjectsListClientProps {
  initialRows: ProjectListRow[];
  statusTerms: ProjectListTerm[];
}

export function ProjectsListClient({ initialRows, statusTerms }: ProjectsListClientProps) {
  const [statusTermId, setStatusTermId] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const rows = useMemo(() => {
    return initialRows.filter((project) => {
      if (!includeArchived && project.archivedAt) return false;
      if (statusTermId && project.statusTerm?.id !== statusTermId) return false;
      return true;
    });
  }, [initialRows, includeArchived, statusTermId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-sm text-muted-foreground whitespace-nowrap">
              Status
            </Label>
            <Select value={statusTermId || "all"} onValueChange={(v) => setStatusTermId(v === "all" ? "" : v)}>
              <SelectTrigger id="status" className="w-[150px]">
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-input"
            />
            Include archived
          </label>
          <Button size="sm" asChild>
            <Link href="/admin/projects/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New project
            </Link>
          </Button>
        </div>
      </div>
      <ProjectListTable projects={rows} />
    </div>
  );
}
