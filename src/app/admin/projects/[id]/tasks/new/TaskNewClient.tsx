"use client";

import { useState, useMemo } from "react";
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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import {
  DEFAULT_TASK_PHASE_SLUG,
  DEFAULT_TASK_STATUS_SLUG,
  DEFAULT_TASK_TYPE_SLUG,
} from "@/lib/supabase/projects";
import { DurationPicker } from "@/components/ui/duration-picker";
import { TaskTermSelectItems } from "@/components/tasks/TaskTermSelectItems";

interface TaskNewClientProps {
  projectId: string;
  projectName: string;
  /** Customizer-driven options (`id` === slug). */
  statusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
  taskPhaseTerms: StatusOrTypeTerm[];
}

export function TaskNewClient({
  projectId,
  projectName,
  statusTerms,
  taskTypeTerms,
  taskPhaseTerms,
}: TaskNewClientProps) {
  const router = useRouter();
  const defaultStatusSlug = useMemo(
    () =>
      statusTerms.find((t) => t.slug === DEFAULT_TASK_STATUS_SLUG)?.slug ??
      statusTerms[0]?.slug ??
      "",
    [statusTerms]
  );
  const defaultTypeSlug = useMemo(
    () =>
      taskTypeTerms.find((t) => t.slug === DEFAULT_TASK_TYPE_SLUG)?.slug ??
      taskTypeTerms[0]?.slug ??
      "",
    [taskTypeTerms]
  );
  const defaultPhaseSlug = useMemo(
    () =>
      taskPhaseTerms.find((t) => t.slug === DEFAULT_TASK_PHASE_SLUG)?.slug ??
      taskPhaseTerms[0]?.slug ??
      "",
    [taskPhaseTerms]
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusSlug, setStatusSlug] = useState(defaultStatusSlug);
  const [typeSlug, setTypeSlug] = useState(defaultTypeSlug);
  const [phaseSlug, setPhaseSlug] = useState(defaultPhaseSlug);
  const [proposedTimeMinutes, setProposedTimeMinutes] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    const phase = phaseSlug || defaultPhaseSlug;
    if (taskPhaseTerms.length > 0 && !phase) {
      setError("Select a task phase.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || undefined,
          task_status_slug: statusSlug || defaultStatusSlug,
          task_type_slug: typeSlug || defaultTypeSlug,
          task_phase_slug: phase || defaultPhaseSlug,
          proposed_time: proposedTimeMinutes ?? undefined,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to create task");
        return;
      }
      router.push(`/admin/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/projects/${projectId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to {projectName}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">New task</h1>
          <p className="text-sm text-muted-foreground">
            Project: {projectName} · Status, type, and phase follow Settings → Customizer (order, labels,
            colors).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusSlug} onValueChange={setStatusSlug}>
                  <SelectTrigger id="status" className="mt-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <TaskTermSelectItems terms={statusTerms} />
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task_type">Type</Label>
                <Select value={typeSlug} onValueChange={setTypeSlug}>
                  <SelectTrigger id="task_type" className="mt-1">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <TaskTermSelectItems terms={taskTypeTerms} />
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task_phase">Phase</Label>
                <Select
                  value={phaseSlug}
                  onValueChange={setPhaseSlug}
                  disabled={taskPhaseTerms.length === 0}
                >
                  <SelectTrigger id="task_phase" className="mt-1">
                    <SelectValue placeholder={taskPhaseTerms.length === 0 ? "No phases" : "Phase"} />
                  </SelectTrigger>
                  <SelectContent>
                    <TaskTermSelectItems terms={taskPhaseTerms} />
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DurationPicker
              value={proposedTimeMinutes}
              onValueChange={setProposedTimeMinutes}
              id="task_proposed_time"
              label="Estimated time"
            />
            <div className="grid max-w-md grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-40"
                />
              </div>
              <div>
                <Label htmlFor="due">Due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-40"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create task"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/admin/projects/${projectId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
