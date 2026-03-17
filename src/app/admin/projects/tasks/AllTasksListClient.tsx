"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Project, Task, TaskPriorityTerm } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import type { TaxonomyTermDisplay } from "@/lib/supabase/taxonomy";
import { TaxonomyChips } from "@/components/taxonomy/TaxonomyChips";
import { TermBadge } from "@/components/taxonomy/TermBadge";

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

interface AllTasksListClientProps {
  initialProjects: Project[];
  initialTasks: Task[];
  priorityTerms: TaskPriorityTerm[];
  statusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  taskTaxonomyMap: Record<string, { categories: TaxonomyTermDisplay[]; tags: TaxonomyTermDisplay[] }>;
}

export function AllTasksListClient({
  initialProjects,
  initialTasks,
  priorityTerms,
  statusTerms,
  taskTypeTerms,
  taskTaxonomyMap,
}: AllTasksListClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [projectId, setProjectId] = useState<string>("");
  const [statusTermId, setStatusTermId] = useState<string>("");
  const [taskTypeTermId, setTaskTypeTermId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const projectMap = new Map(initialProjects.map((p) => [p.id, p.name]));

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (statusTermId) params.set("status_term_id", statusTermId);
      if (taskTypeTermId) params.set("task_type_term_id", taskTypeTermId);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, statusTermId, taskTypeTermId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">All tasks</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="project" className="text-sm text-muted-foreground whitespace-nowrap">
              Project
            </Label>
            <Select value={projectId || "all"} onValueChange={(v) => setProjectId(v === "all" ? "" : v)}>
              <SelectTrigger id="project" className="w-[200px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {initialProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.archived_at ? " (archived)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-sm text-muted-foreground whitespace-nowrap">
              Status
            </Label>
            <Select value={statusTermId || "all"} onValueChange={(v) => setStatusTermId(v === "all" ? "" : v)}>
              <SelectTrigger id="status" className="w-[130px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusTerms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="type" className="text-sm text-muted-foreground whitespace-nowrap">
              Type
            </Label>
            <Select value={taskTypeTermId || "all"} onValueChange={(v) => setTaskTypeTermId(v === "all" ? "" : v)}>
              <SelectTrigger id="type" className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {taskTypeTerms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-4 text-left font-medium">Title</th>
                  <th className="h-9 px-4 text-left font-medium">Project</th>
                  <th className="h-9 px-4 text-left font-medium">Status</th>
                  <th className="h-9 px-4 text-left font-medium">Priority</th>
                  <th className="h-9 px-4 text-left font-medium">Categories & tags</th>
                  <th className="h-9 px-4 text-left font-medium">Type</th>
                  <th className="h-9 px-4 text-left font-medium">Start</th>
                  <th className="h-9 px-4 text-left font-medium">Due</th>
                  <th className="h-9 w-24 px-4 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No tasks match the filters.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => {
                    const taxonomy = taskTaxonomyMap[t.id] ?? { categories: [], tags: [] };
                    return (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{t.title}</td>
                      <td className="p-3">
                        <Link
                          href={`/admin/projects/${t.project_id}`}
                          className="text-primary hover:underline"
                        >
                          {projectMap.get(t.project_id) ?? t.project_id.slice(0, 8) + "…"}
                        </Link>
                      </td>
                      <td className="p-3">
                        <TermBadge term={statusTerms.find((s) => s.id === t.status_term_id)} />
                      </td>
                      <td className="p-3">
                        <TermBadge term={priorityTerms.find((p) => p.id === t.priority_term_id) ?? null} />
                      </td>
                      <td className="p-3">
                        <TaxonomyChips categories={taxonomy.categories} tags={taxonomy.tags} className="max-w-[180px]" />
                      </td>
                      <td className="p-3">
                        <TermBadge term={taskTypeTerms.find((s) => s.id === t.task_type_term_id)} />
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(t.start_date)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(t.due_date)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link href={`/admin/projects/${t.project_id}/tasks/${t.id}`}>
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ); })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
