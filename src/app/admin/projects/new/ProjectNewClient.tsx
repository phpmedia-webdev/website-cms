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
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { DurationPicker } from "@/components/ui/duration-picker";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import { setTaxonomyForContent } from "@/lib/supabase/taxonomy";

interface ProjectNewClientProps {
  statusTerms: StatusOrTypeTerm[];
  typeTerms: StatusOrTypeTerm[];
}

export function ProjectNewClient({ statusTerms, typeTerms }: ProjectNewClientProps) {
  const router = useRouter();
  const defaultStatusId = statusTerms.find((t) => t.slug === "new")?.id ?? statusTerms[0]?.id ?? "";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [statusTermId, setStatusTermId] = useState<string>(defaultStatusId);
  const [projectTypeTermId, setProjectTypeTermId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [proposedTimeMinutes, setProposedTimeMinutes] = useState<number | null>(null);
  const [potentialSales, setPotentialSales] = useState("");
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
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
          status_term_id: statusTermId || undefined,
          project_type_term_id: projectTypeTermId || undefined,
          start_date: startDate || undefined,
          due_date: dueDate || undefined,
          proposed_time: proposedTimeMinutes ?? undefined,
          potential_sales: potentialSales ? parseFloat(potentialSales) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to create project");
        return;
      }
      const projectId = data.id as string;
      const termIds = [...taxonomyCategoryIds, ...taxonomyTagIds];
      if (termIds.length > 0) {
        await setTaxonomyForContent(projectId, "project", termIds);
      }
      router.push(`/admin/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/projects">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to projects
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">New project</h1>
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
              <Select value={statusTermId} onValueChange={setStatusTermId}>
                <SelectTrigger id="status" className="mt-1 w-[140px]">
                  <SelectValue />
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
            {typeTerms.length > 0 && (
              <div>
                <Label htmlFor="project_type">Type</Label>
                <Select value={projectTypeTermId || "none"} onValueChange={(v) => setProjectTypeTermId(v === "none" ? "" : v)}>
                  <SelectTrigger id="project_type" className="mt-1 w-[140px]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {typeTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DurationPicker
              value={proposedTimeMinutes}
              onValueChange={setProposedTimeMinutes}
              id="proposed_time"
              label="Estimated time"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start date</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="due">Due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categories & tags</Label>
              <TaxonomyAssignmentForContent
                contentTypeSlug="project"
                section="project"
                sectionLabel="Projects"
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
                {submitting ? "Creating…" : "Create project"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/projects">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
