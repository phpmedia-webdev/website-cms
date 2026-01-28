"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface CrmSettingsClientProps {
  initialNoteTypes: string[];
}

export function CrmSettingsClient({ initialNoteTypes }: CrmSettingsClientProps) {
  const [noteTypes, setNoteTypes] = useState<string[]>(initialNoteTypes);
  const [newType, setNewType] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAddType = () => {
    const trimmed = newType.trim().toLowerCase();
    if (trimmed && !noteTypes.includes(trimmed)) {
      setNoteTypes([...noteTypes, trimmed]);
      setNewType("");
      setSaved(false);
    }
  };

  const handleRemoveType = (type: string) => {
    setNoteTypes(noteTypes.filter((t) => t !== type));
    setSaved(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTypes = [...noteTypes];
    [newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]];
    setNoteTypes(newTypes);
    setSaved(false);
  };

  const handleMoveDown = (index: number) => {
    if (index === noteTypes.length - 1) return;
    const newTypes = [...noteTypes];
    [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
    setNoteTypes(newTypes);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/crm/note-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: noteTypes }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Note Types</CardTitle>
        <CardDescription>
          Define the types of notes that can be added to contacts (e.g., call, task, email, meeting)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current types */}
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

        {/* Add new type */}
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

        {/* Save button */}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </CardContent>
    </Card>
  );
}
