"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2 } from "lucide-react";
import type { CrmNote } from "@/lib/supabase/crm";

interface ContactNotesSectionProps {
  contactId: string;
  initialNotes: CrmNote[];
  noteTypes?: string[];
}

/**
 * Activity Stream (notes) section for contact detail.
 * Self-contained: manages notes state, search, add/edit/delete modal.
 */
export function ContactNotesSection({
  contactId,
  initialNotes,
  noteTypes = ["call", "task", "email", "meeting"],
}: ContactNotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CrmNote | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return notes;
    const q = noteSearch.toLowerCase();
    return notes.filter(
      (n) =>
        n.body.toLowerCase().includes(q) ||
        (n.note_type && n.note_type.toLowerCase().includes(q))
    );
  }, [notes, noteSearch]);

  const openAddNoteModal = () => {
    setEditingNote(null);
    setNoteBody("");
    setNoteType("");
    setNoteModalOpen(true);
  };

  const openEditNoteModal = (note: CrmNote) => {
    setEditingNote(note);
    setNoteBody(note.body);
    setNoteType(note.note_type || "");
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    try {
      if (editingNote) {
        const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note_id: editingNote.id,
            body: noteBody.trim(),
            note_type: noteType || null,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          setNoteModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: noteBody.trim(), note_type: noteType || null }),
        });
        if (res.ok) {
          const created = await res.json();
          setNotes((prev) => [created, ...prev]);
          setNoteModalOpen(false);
        }
      }
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!editingNote) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_id: editingNote.id }),
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== editingNote.id));
        setNoteModalOpen(false);
      }
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between py-2 px-4 border-b">
          <span className="text-sm font-semibold">Activity Stream</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openAddNoteModal}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Custom Note
          </Button>
        </div>
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                {notes.length === 0 ? "No activity yet" : "No activity matches your search"}
              </p>
            ) : (
              filteredNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="w-full text-left rounded px-2 py-1.5 hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => openEditNoteModal(n)}
                >
                  <p className="truncate">{n.body}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1.5">
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                    {n.note_type && (
                      <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted">
                        {n.note_type}
                      </span>
                    )}
                    {n.updated_at && n.updated_at !== n.created_at && (
                      <span className="italic">(edited)</span>
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingNote ? "Edit Note" : "Add Custom Note"}</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="noteBody">Note</Label>
                <textarea
                  id="noteBody"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Enter note..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noteType">Type (optional)</Label>
                <select
                  id="noteType"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                >
                  <option value="">None</option>
                  {noteTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <div>
                {editingNote && (
                  <Button variant="destructive" onClick={handleDeleteNote} disabled={noteSaving}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setNoteModalOpen(false)} disabled={noteSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNote} disabled={noteSaving || !noteBody.trim()}>
                  {noteSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
