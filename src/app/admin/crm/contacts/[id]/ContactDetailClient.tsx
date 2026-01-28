"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Plus, X, Search, Trash2 } from "lucide-react";
import type { CrmNote, ContactCustomFieldValue, ContactMag, ContactMarketingList } from "@/lib/supabase/crm";

interface ContactDetailClientProps {
  contactId: string;
  initialNotes: CrmNote[];
  initialCustomFields: ContactCustomFieldValue[];
  initialMags: ContactMag[];
  initialMarketingLists: ContactMarketingList[];
  initialNoteTypes?: string[];
}

export function ContactDetailClient({
  contactId,
  initialNotes,
  initialCustomFields,
  initialMags,
  initialMarketingLists,
  initialNoteTypes = ["call", "task", "email", "meeting"],
}: ContactDetailClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [mags, setMags] = useState(initialMags);
  const [marketingLists, setMarketingLists] = useState(initialMarketingLists);
  const [noteTypes, setNoteTypes] = useState<string[]>(initialNoteTypes);

  // Notes modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CrmNote | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<string>("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Notes search
  const [noteSearch, setNoteSearch] = useState("");

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    customFields: false,
    marketingLists: false,
    mags: false,
  });

  // Search state for MAGs and Lists
  const [magSearch, setMagSearch] = useState("");
  const [magResults, setMagResults] = useState<{ id: string; name: string; uid: string }[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [listResults, setListResults] = useState<{ id: string; name: string; slug: string }[]>([]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return notes;
    const q = noteSearch.toLowerCase();
    return notes.filter(
      (n) =>
        n.body.toLowerCase().includes(q) ||
        (n.note_type && n.note_type.toLowerCase().includes(q))
    );
  }, [notes, noteSearch]);

  // Open modal for add
  const openAddNoteModal = () => {
    setEditingNote(null);
    setNoteBody("");
    setNoteType("");
    setNoteModalOpen(true);
  };

  // Open modal for edit
  const openEditNoteModal = (note: CrmNote) => {
    setEditingNote(note);
    setNoteBody(note.body);
    setNoteType(note.note_type || "");
    setNoteModalOpen(true);
  };

  // Save note (add or update)
  const handleSaveNote = async () => {
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    try {
      if (editingNote) {
        // Update
        const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: editingNote.id, body: noteBody.trim(), note_type: noteType || null }),
        });
        if (res.ok) {
          const updated = await res.json();
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          setNoteModalOpen(false);
        }
      } else {
        // Create
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

  // Delete note
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

  // Search MAGs
  const handleMagSearch = async (q: string) => {
    setMagSearch(q);
    if (q.length < 1) {
      setMagResults([]);
      return;
    }
    const res = await fetch(`/api/crm/mags/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setMagResults(data.filter((m: any) => !mags.some((cm) => cm.mag_id === m.id)));
    }
  };

  // Add MAG
  const handleAddMag = async (magId: string, magName: string, magUid: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mag_id: magId, assigned_via: "admin" }),
    });
    if (res.ok) {
      setMags((prev) => [
        ...prev,
        { id: "", contact_id: contactId, mag_id: magId, mag_name: magName, mag_uid: magUid, assigned_via: "admin", assigned_at: new Date().toISOString() },
      ]);
      setMagSearch("");
      setMagResults([]);
    }
  };

  // Remove MAG
  const handleRemoveMag = async (magId: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mag_id: magId }),
    });
    if (res.ok) {
      setMags((prev) => prev.filter((m) => m.mag_id !== magId));
    }
  };

  // Search Lists
  const handleListSearch = async (q: string) => {
    setListSearch(q);
    if (q.length < 1) {
      setListResults([]);
      return;
    }
    const res = await fetch(`/api/crm/lists/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setListResults(data.filter((l: any) => !marketingLists.some((ml) => ml.list_id === l.id)));
    }
  };

  // Add List
  const handleAddList = async (listId: string, listName: string, listSlug: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list_id: listId }),
    });
    if (res.ok) {
      setMarketingLists((prev) => [
        ...prev,
        { id: "", contact_id: contactId, list_id: listId, list_name: listName, list_slug: listSlug, added_at: new Date().toISOString() },
      ]);
      setListSearch("");
      setListResults([]);
    }
  };

  // Remove List
  const handleRemoveList = async (listId: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/lists`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list_id: listId }),
    });
    if (res.ok) {
      setMarketingLists((prev) => prev.filter((l) => l.list_id !== listId));
    }
  };

  return (
    <>
      {/* Notes — compact block, no Card; clickable rows */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between py-2 px-4 border-b">
          <span className="text-sm font-semibold">Notes</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openAddNoteModal}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                {notes.length === 0 ? "No notes yet" : "No notes match your search"}
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

      {/* Note Modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingNote ? "Edit Note" : "Add Note"}</h2>
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
                    <option key={t} value={t}>{t}</option>
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

      {/* Accordion: Custom Fields */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
          onClick={() => toggleSection("customFields")}
        >
          <span>Custom Fields</span>
          {openSections.customFields ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {openSections.customFields && (
          <CardContent className="pt-0 px-4 pb-4">
            {initialCustomFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom fields</p>
            ) : (
              <dl className="grid gap-1.5 sm:grid-cols-2 text-sm">
                {initialCustomFields.map((cf) => (
                  <div key={cf.id}>
                    <dt className="font-medium text-muted-foreground text-xs">{cf.custom_field_label}</dt>
                    <dd className="text-sm">{cf.value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        )}
      </Card>

      {/* Accordion: Marketing Lists */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
          onClick={() => toggleSection("marketingLists")}
        >
          <span>Marketing Lists</span>
          {openSections.marketingLists ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {openSections.marketingLists && (
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search lists to add..."
                value={listSearch}
                onChange={(e) => handleListSearch(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
              {listResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
                  {listResults.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 hover:bg-muted text-sm"
                      onClick={() => handleAddList(l.id, l.name, l.slug)}
                    >
                      {l.name} <span className="text-muted-foreground">({l.slug})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {marketingLists.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not in any marketing lists</p>
            ) : (
              <ul className="space-y-0.5">
                {marketingLists.map((l) => (
                  <li key={l.list_id} className="flex items-center justify-between text-sm py-0.5">
                    <span>{l.list_name}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveList(l.list_id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        )}
      </Card>

      {/* Accordion: Membership Access Groups */}
      <Card className="overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
          onClick={() => toggleSection("mags")}
        >
          <span>Membership Access Groups</span>
          {openSections.mags ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {openSections.mags && (
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search MAGs to add..."
                value={magSearch}
                onChange={(e) => handleMagSearch(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
              {magResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
                  {magResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 hover:bg-muted text-sm"
                      onClick={() => handleAddMag(m.id, m.name, m.uid)}
                    >
                      {m.name} <span className="text-muted-foreground">({m.uid})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No memberships assigned</p>
            ) : (
              <ul className="space-y-0.5">
                {mags.map((m) => (
                  <li key={m.mag_id} className="flex items-center justify-between text-sm py-0.5">
                    <span>{m.mag_name} <span className="text-muted-foreground">({m.mag_uid})</span></span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveMag(m.mag_id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        )}
      </Card>
    </>
  );
}
