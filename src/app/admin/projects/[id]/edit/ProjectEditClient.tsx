"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/lib/supabase/projects";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "perpetual", label: "Perpetual" },
] as const;

function toInputDate(s: string | null): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

interface ProjectEditClientProps {
  project: Project;
}

export function ProjectEditClient({ project }: ProjectEditClientProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<"new" | "active" | "closed" | "perpetual">(project.status);
  const [proposedStartDate, setProposedStartDate] = useState(toInputDate(project.proposed_start_date));
  const [proposedEndDate, setProposedEndDate] = useState(toInputDate(project.proposed_end_date));
  const [potentialSales, setPotentialSales] = useState(
    project.potential_sales != null ? String(project.potential_sales) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || null,
          status,
          proposed_start_date: proposedStartDate || null,
          proposed_end_date: proposedEndDate || null,
          potential_sales: potentialSales ? parseFloat(potentialSales) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error ?? "Failed to update project");
        return;
      }
      router.push(`/admin/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/projects/${project.id}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to project
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Edit project</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger id="status" className="mt-1 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Proposed start date</Label>
                <Input
                  id="start"
                  type="date"
                  value={proposedStartDate}
                  onChange={(e) => setProposedStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end">Proposed end date</Label>
                <Input
                  id="end"
                  type="date"
                  value={proposedEndDate}
                  onChange={(e) => setProposedEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sales">Potential sales</Label>
              <Input
                id="sales"
                type="number"
                step="0.01"
                min="0"
                value={potentialSales}
                onChange={(e) => setPotentialSales(e.target.value)}
                placeholder="0"
                className="mt-1 w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/admin/projects/${project.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
