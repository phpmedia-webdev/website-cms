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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { TaskPriorityTerm, StatusOrTypeTerm } from "@/lib/supabase/projects";
import { DurationPicker } from "@/components/ui/duration-picker";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import { setTaxonomyForContent } from "@/lib/supabase/taxonomy";

interface TaskNewClientProps {
  projectId: string;
  projectName: string;
  priorityTerms: TaskPriorityTerm[];
  statusTerms: StatusOrTypeTerm[];
  taskTypeTerms: StatusOrTypeTerm[];
}

export function TaskNewClient({
  projectId,
  projectName,
  priorityTerms,
  statusTerms,
  taskTypeTerms,
}: TaskNewClientProps) {
  const router = useRouter();
  const defaultPriorityId = useMemo(
    () => priorityTerms.find((t) => t.slug === "medium")?.id ?? priorityTerms[0]?.id ?? "",
    [priorityTerms]
  );
  const defaultStatusId = useMemo(
    () => statusTerms.find((t) => t.slug === "open")?.id ?? statusTerms[0]?.id ?? "",
    [statusTerms]
  );
  const defaultTypeId = useMemo(
    () => taskTypeTerms.find((t) => t.slug === "default")?.id ?? taskTypeTerms[0]?.id ?? "",
    [taskTypeTerms]
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusTermId, setStatusTermId] = useState(defaultStatusId);
  const [taskTypeTermId, setTaskTypeTermId] = useState(defaultTypeId);
  const [priorityTermId, setPriorityTermId] = useState(defaultPriorityId);
  const [proposedTimeMinutes, setProposedTimeMinutes] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxonomyCategoryIds, setTaxonomyCategoryIds] = useState<Set<string>>(new Set());
  const [taxonomyTagIds, setTaxonomyTagIds] = useState<Set<string>>(new Set());

  const handleCategoryToggle = (id: string, checked: boolean) => {
    setTaxonomyCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const handleTagToggle = (id: string, checked: boolean) => {
    setTaxonomyTagIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
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
          status_term_id: statusTermId || defaultStatusId,
          task_type_term_id: taskTypeTermId || defaultTypeId,
          priority_term_id: priorityTermId || defaultPriorityId,
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
      const taskId = data.id as string;
      const termIds = [...taxonomyCategoryIds, ...taxonomyTagIds];
      if (termIds.length > 0) {
        await setTaxonomyForContent(taskId, "task", termIds);
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
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {projectName}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">New task</h1>
          <p className="text-sm text-muted-foreground">Project: {projectName}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusTermId} onValueChange={setStatusTermId}>
                  <SelectTrigger id="status" className="mt-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task_type">Type</Label>
                <Select value={taskTypeTermId} onValueChange={setTaskTypeTermId}>
                  <SelectTrigger id="task_type" className="mt-1">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypeTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priorityTermId} onValueChange={setPriorityTermId}>
                  <SelectTrigger id="priority" className="mt-1">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
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
            <div className="grid grid-cols-2 gap-4 max-w-md">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categories & tags</Label>
              <TaxonomyAssignmentForContent
                contentTypeSlug="task"
                section="task"
                sectionLabel="Tasks"
                compact
                embedded
                selectedCategoryIds={taxonomyCategoryIds}
                selectedTagIds={taxonomyTagIds}
                onCategoryToggle={handleCategoryToggle}
                onTagToggle={handleTagToggle}
              />
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
