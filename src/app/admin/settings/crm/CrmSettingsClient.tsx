"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import { CRM_STATUS_SLUG_NEW } from "@/lib/supabase/settings";

interface CrmSettingsClientProps {
  initialNoteTypes: string[];
  initialContactStatuses: CrmContactStatusOption[];
}

export function CrmSettingsClient({
  initialNoteTypes,
  initialContactStatuses,
}: CrmSettingsClientProps) {
  const [noteTypes, setNoteTypes] = useState<string[]>(initialNoteTypes);
  const [newType, setNewType] = useState("");
  const [noteTypesSaving, setNoteTypesSaving] = useState(false);
  const [noteTypesSaved, setNoteTypesSaved] = useState(false);

  const [contactStatuses, setContactStatuses] = useState<CrmContactStatusOption[]>(
    initialContactStatuses
  );
  const [statusesSaving, setStatusesSaving] = useState(false);
  const [statusesSaved, setStatusesSaved] = useState(false);

  // --- Contact Statuses ---
  const handleStatusChange = (index: number, field: keyof CrmContactStatusOption, value: string) => {
    setContactStatuses((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setStatusesSaved(false);
  };

  const handleAddStatus = () => {
    setContactStatuses((prev) => [
      ...prev,
      { slug: "", label: "", color: "#6b7280" },
    ]);
    setStatusesSaved(false);
  };

  const handleRemoveStatus = (index: number) => {
    const slug = contactStatuses[index]?.slug?.trim().toLowerCase();
    if (slug === CRM_STATUS_SLUG_NEW) return; // fixed status for sidebar badge
    setContactStatuses((prev) => prev.filter((_, i) => i !== index));
    setStatusesSaved(false);
  };

  const handleStatusMoveUp = (index: number) => {
    if (index === 0) return;
    setContactStatuses((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setStatusesSaved(false);
  };

  const handleStatusMoveDown = (index: number) => {
    if (index === contactStatuses.length - 1) return;
    setContactStatuses((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setStatusesSaved(false);
  };

  const handleSaveStatuses = async () => {
    const valid = contactStatuses.every(
      (s) => s.slug.trim() && s.label.trim() && s.color
    );
    if (!valid) return;
    const slugs = contactStatuses.map((s) => s.slug.trim().toLowerCase());
    if (new Set(slugs).size !== slugs.length) return; // duplicate slugs
    setStatusesSaving(true);
    setStatusesSaved(false);
    try {
      const res = await fetch("/api/settings/crm/contact-statuses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statuses: contactStatuses.map((s) => ({
            slug: s.slug.trim().toLowerCase(),
            label: s.label.trim(),
            color: s.color,
          })),
        }),
      });
      if (res.ok) setStatusesSaved(true);
    } finally {
      setStatusesSaving(false);
    }
  };

  // --- Note Types ---
  const handleAddType = () => {
    const trimmed = newType.trim().toLowerCase();
    if (trimmed && !noteTypes.includes(trimmed)) {
      setNoteTypes([...noteTypes, trimmed]);
      setNewType("");
      setNoteTypesSaved(false);
    }
  };

  const handleRemoveType = (type: string) => {
    setNoteTypes(noteTypes.filter((t) => t !== type));
    setNoteTypesSaved(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTypes = [...noteTypes];
    [newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]];
    setNoteTypes(newTypes);
    setNoteTypesSaved(false);
  };

  const handleMoveDown = (index: number) => {
    if (index === noteTypes.length - 1) return;
    const newTypes = [...noteTypes];
    [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
    setNoteTypes(newTypes);
    setNoteTypesSaved(false);
  };

  const handleSaveNoteTypes = async () => {
    setNoteTypesSaving(true);
    setNoteTypesSaved(false);
    try {
      const res = await fetch("/api/settings/crm/note-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: noteTypes }),
      });
      if (res.ok) setNoteTypesSaved(true);
    } finally {
      setNoteTypesSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Statuses card (first) */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Statuses</CardTitle>
          <CardDescription>
            Define the status options for contacts (e.g., New, Contacted, Archived). Order and color are used in the contact list and detail views.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {contactStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No statuses defined</p>
            ) : (
              contactStatuses.map((status, index) => {
                const isFixedNew = status.slug.trim().toLowerCase() === CRM_STATUS_SLUG_NEW;
                return (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-muted/30"
                  >
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => handleStatusMoveUp(index)}
                        disabled={index === 0}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => handleStatusMoveDown(index)}
                        disabled={index === contactStatuses.length - 1}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <Input
                      placeholder="Slug (e.g. new)"
                      value={status.slug}
                      onChange={(e) => !isFixedNew && handleStatusChange(index, "slug", e.target.value)}
                      className="w-28 h-8 text-sm font-mono"
                      readOnly={isFixedNew}
                      title={isFixedNew ? "Required for sidebar badge—cannot change slug" : undefined}
                    />
                    <Input
                      placeholder="Label"
                      value={status.label}
                      onChange={(e) => handleStatusChange(index, "label", e.target.value)}
                      className="w-32 h-8 text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={status.color}
                        onChange={(e) => handleStatusChange(index, "color", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-input"
                      />
                      <span className="text-xs text-muted-foreground font-mono w-14 truncate">
                        {status.color}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStatus(index)}
                      className="h-8 w-8 p-0 shrink-0"
                      disabled={isFixedNew}
                      title={isFixedNew ? "Required for sidebar badge—cannot remove" : "Remove status"}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddStatus} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add status
            </Button>
            <Button onClick={handleSaveStatuses} disabled={statusesSaving}>
              {statusesSaving ? "Saving…" : "Save statuses"}
            </Button>
            {statusesSaved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </CardContent>
      </Card>

      {/* Note Types card (second) */}
      <Card>
        <CardHeader>
          <CardTitle>Note Types</CardTitle>
          <CardDescription>
            Define the types of notes that can be added to contacts (e.g., call, task, email, meeting)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {noteTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No note types defined</p>
            ) : (
              noteTypes.map((type, index) => (
                <div key={type} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === noteTypes.length - 1}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <span className="flex-1 text-sm font-medium">{type}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveType(type)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add new type..."
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddType()}
              className="flex-1"
            />
            <Button onClick={handleAddType} disabled={!newType.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSaveNoteTypes} disabled={noteTypesSaving}>
              {noteTypesSaving ? "Saving..." : "Save note types"}
            </Button>
            {noteTypesSaved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
