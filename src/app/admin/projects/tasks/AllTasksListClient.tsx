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
import { TermBadge } from "@/components/taxonomy/TermBadge";
import type { TaskAssigneeItem } from "../page";

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

/** Mini avatar stack: up to 3 circles, then "+" if more. */
function TaskAssigneeAvatars({ assignees }: { assignees: TaskAssigneeItem[] }) {
  const max = 3;
  const visible = assignees.slice(0, max);
  const overflow = assignees.length - visible.length;
  function initials(label: string) {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
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

interface AllTasksListClientProps {
  initialProjects: Project[];
  initialTasks: Task[];
  priorityTerms: TaskPriorityTerm[];
  statusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  taskTaxonomyMap: Record<string, { categories: TaxonomyTermDisplay[]; tags: TaxonomyTermDisplay[] }>;
  taskAssigneesMap: Record<string, TaskAssigneeItem[]>;
  taskTimeLogTotals: Record<string, number>;
}

export function AllTasksListClient({
  initialProjects,
  initialTasks,
  priorityTerms,
  statusTerms,
  taskTypeTerms,
  taskTaxonomyMap,
  taskAssigneesMap,
  taskTimeLogTotals,
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
                  <th className="h-9 px-4 text-left font-medium">Assignee</th>
                  <th className="h-9 px-4 text-left font-medium">Priority</th>
                  <th className="h-9 px-4 text-left font-medium">Type</th>
                  <th className="h-9 px-4 text-left font-medium">Due Date</th>
                  <th className="h-9 px-4 text-left font-medium">Progress</th>
                  <th className="h-9 px-4 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No tasks match the filters.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <Link
                          href={`/admin/projects/${t.project_id}/tasks/${t.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/admin/projects/${t.project_id}`}
                          className="text-primary hover:underline"
                        >
                          {projectMap.get(t.project_id) ?? t.project_id.slice(0, 8) + "…"}
                        </Link>
                      </td>
                      <td className="p-3">
                        <TaskAssigneeAvatars assignees={taskAssigneesMap[t.id] ?? []} />
                      </td>
                      <td className="p-3">
                        <TermBadge term={priorityTerms.find((p) => p.id === t.priority_term_id) ?? null} />
                      </td>
                      <td className="p-3">
                        <TermBadge term={taskTypeTerms.find((s) => s.id === t.task_type_term_id)} />
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(t.due_date)}</td>
                      <td className="p-3">
                        {(() => {
                          const estimated = t.proposed_time ?? 0;
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
                      <td className="p-3">
                        <TermBadge term={statusTerms.find((s) => s.id === t.status_term_id)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
