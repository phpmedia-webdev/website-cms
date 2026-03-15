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
import { Plus } from "lucide-react";
import type { Project } from "@/lib/supabase/projects";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "perpetual", label: "Perpetual" },
] as const;

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

interface ProjectsListClientProps {
  initialProjects: Project[];
}

export function ProjectsListClient({
  initialProjects,
}: ProjectsListClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [status, setStatus] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (includeArchived) params.set("include_archived", "true");
      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.projects)) {
        setProjects(data.projects);
      }
    } finally {
      setLoading(false);
    }
  }, [status, includeArchived]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-sm text-muted-foreground whitespace-nowrap">
              Status
            </Label>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger id="status" className="w-[130px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "all"}>
                    {o.label}
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
          <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/projects/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New project
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-4 text-left font-medium">Name</th>
                  <th className="h-9 px-4 text-left font-medium">Status</th>
                  <th className="h-9 px-4 text-left font-medium">Start</th>
                  <th className="h-9 px-4 text-left font-medium">End</th>
                  <th className="h-9 px-4 text-left font-medium">Potential sales</th>
                  <th className="h-9 px-4 text-left font-medium">MAG</th>
                  <th className="h-9 w-20 px-4 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No projects yet. Click “New project” to add one.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.archived_at && (
                          <span className="ml-2 text-xs text-muted-foreground">(archived)</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground capitalize">{p.status}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(p.proposed_start_date)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(p.proposed_end_date)}</td>
                      <td className="p-3 text-muted-foreground">
                        {p.potential_sales != null ? Number(p.potential_sales).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {p.required_mag_id ? p.required_mag_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <Link href={`/admin/projects/${p.id}`}>View</Link>
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
    </div>
  );
}
