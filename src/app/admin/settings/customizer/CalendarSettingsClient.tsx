"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { CalendarResourceTypeOption } from "@/lib/supabase/settings";

interface CalendarSettingsClientProps {
  initialResourceTypes: CalendarResourceTypeOption[];
}

export function CalendarSettingsClient({
  initialResourceTypes,
}: CalendarSettingsClientProps) {
  const [types, setTypes] = useState<CalendarResourceTypeOption[]>(initialResourceTypes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (index: number, field: keyof CalendarResourceTypeOption, value: string) => {
    setTypes((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
    setSaved(false);
  };

  const handleAdd = () => {
    setTypes((prev) => [...prev, { slug: "", label: "" }]);
    setSaved(false);
  };

  const handleRemove = (index: number) => {
    setTypes((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setTypes((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setSaved(false);
  };

  const handleMoveDown = (index: number) => {
    if (index === types.length - 1) return;
    setTypes((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    const valid = types.every((t) => t.slug.trim() && t.label.trim());
    if (!valid) return;
    const slugs = types.map((t) => t.slug.trim().toLowerCase().replace(/\s+/g, "-"));
    if (new Set(slugs).size !== slugs.length) {
      alert("Duplicate slugs are not allowed.");
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/calendar/resource-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          types: types.map((t) => ({
            slug: t.slug.trim().toLowerCase().replace(/\s+/g, "-"),
            label: t.label.trim(),
          })),
        }),
      });
      if (res.ok) setSaved(true);
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Resource Types</CardTitle>
        <CardDescription>
          Define the types for calendar resources (e.g., Room, Equipment, Video). These appear in the Resources dropdown when adding or editing a resource under Calendar. Order is used in the dropdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {types.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resource types defined</p>
          ) : (
            types.map((t, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-muted/30"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === types.length - 1}
                    aria-label="Move down"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <Input
                  placeholder="Slug (e.g. room)"
                  value={t.slug}
                  onChange={(e) => handleChange(index, "slug", e.target.value)}
                  className="w-28 h-8 text-sm font-mono"
                />
                <Input
                  placeholder="Label (e.g. Room)"
                  value={t.label}
                  onChange={(e) => handleChange(index, "label", e.target.value)}
                  className="w-32 h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="h-8 w-8 p-0 shrink-0"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAdd} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add type
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save resource types"}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </CardContent>
    </Card>
  );
}
