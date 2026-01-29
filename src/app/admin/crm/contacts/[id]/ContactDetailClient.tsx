"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Plus, X, Search, Trash2, Pencil } from "lucide-react";
import type { CrmNote, CrmCustomField, ContactCustomFieldValue, ContactMag, ContactMarketingList, Form } from "@/lib/supabase/crm";

export type ContactDetailSection = "notes" | "customFields" | "marketingLists" | "mags";

interface ContactDetailClientProps {
  contactId: string;
  initialNotes: CrmNote[];
  /** All CRM custom field definitions (from Settings/Forms); shown for every contact with value or empty. */
  initialCustomFieldDefinitions: CrmCustomField[];
  /** This contact's custom field values (from crm_contact_custom_fields). */
  initialContactCustomFieldValues: ContactCustomFieldValue[];
  /** All forms (for Custom Fields section filter). */
  initialForms: Form[];
  /** This contact's form_id (for "Contact's form" filter option). */
  contactFormId: string | null;
  initialMags: ContactMag[];
  initialMarketingLists: ContactMarketingList[];
  initialNoteTypes?: string[];
  /** When set, render only this section (for tabbed layout). When undefined, render all sections in accordion. */
  activeSection?: ContactDetailSection | null;
}

export function ContactDetailClient({
  contactId,
  initialNotes,
  initialCustomFieldDefinitions,
  initialContactCustomFieldValues,
  initialForms,
  contactFormId,
  initialMags,
  initialMarketingLists,
  initialNoteTypes = ["call", "task", "email", "meeting"],
  activeSection = null,
}: ContactDetailClientProps) {
  const [notes, setNotes] = useState(initialNotes);

  // Sync notes state when initialNotes changes (e.g. after router.refresh() from Copy to Notes)
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Custom field values (mutable so we can update after inline save without full refresh)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const v of initialContactCustomFieldValues) {
      map[v.custom_field_id] = v.value;
    }
    return map;
  });
  // Merge definitions with current values
  const customFieldsWithValues = useMemo(() => {
    return initialCustomFieldDefinitions.map((def) => ({
      definition: def,
      value: customFieldValues[def.id] ?? null,
    }));
  }, [initialCustomFieldDefinitions, customFieldValues]);

  // Inline edit: which row is being edited and draft value
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [customFieldEditValue, setCustomFieldEditValue] = useState("");
  const [customFieldSaving, setCustomFieldSaving] = useState(false);

  const [mags, setMags] = useState(initialMags);
  const [marketingLists, setMarketingLists] = useState(initialMarketingLists);
  const [noteTypes, setNoteTypes] = useState<string[]>(initialNoteTypes);

  // Confirm remove MAG state (for modal confirmation instead of window.confirm which gets suppressed by Cursor browser)
  const [confirmRemoveMag, setConfirmRemoveMag] = useState<{ id: string; name: string } | null>(null);
  const [removingMag, setRemovingMag] = useState(false);

  // Notes modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CrmNote | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<string>("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Notes search
  const [noteSearch, setNoteSearch] = useState("");

  // Accordion state: persist per contact so sections stay open when returning from Edit (same contact)
  const OPEN_SECTIONS_KEY = (id: string) => `crm-contact-detail-open-sections-${id}`;
  const getStoredOpenSections = (id: string): Record<string, boolean> | null => {
    if (typeof window === "undefined") return null;
    try {
      const s = sessionStorage.getItem(OPEN_SECTIONS_KEY(id));
      if (!s) return null;
      const parsed = JSON.parse(s) as Record<string, boolean>;
      if (
        parsed &&
        typeof parsed.customFields === "boolean" &&
        typeof parsed.marketingLists === "boolean" &&
        typeof parsed.mags === "boolean"
      )
        return parsed;
    } catch {
      // ignore invalid JSON
    }
    return null;
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const stored = getStoredOpenSections(contactId);
    return stored ?? { customFields: false, marketingLists: false, mags: false };
  });
  useEffect(() => {
    sessionStorage.setItem(OPEN_SECTIONS_KEY(contactId), JSON.stringify(openSections));
  }, [contactId, openSections]);

  // Custom Fields form filter: All | Contact's form | specific form (persist across contacts)
  const FORM_FILTER_KEY = "crm-contact-custom-fields-form-filter";
  const getStoredFormFilter = (): string => {
    if (typeof window === "undefined") return "all";
    try {
      const s = sessionStorage.getItem(FORM_FILTER_KEY);
      if (s && (s === "all" || s === "contact" || s.length > 0)) return s;
    } catch {
      // ignore
    }
    return "all";
  };
  const [formFilter, setFormFilter] = useState<string>(() => getStoredFormFilter());
  const [formFieldCustomIds, setFormFieldCustomIds] = useState<Set<string> | null>(null);

  const effectiveFormId =
    formFilter === "contact" && contactFormId ? contactFormId : formFilter === "all" ? null : formFilter;

  useEffect(() => {
    if (!effectiveFormId) {
      setFormFieldCustomIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/crm/forms/${effectiveFormId}/fields`);
        if (!res.ok || cancelled) return;
        const assignments = (await res.json()) as Array<{ field_source?: string; custom_field_id?: string | null }>;
        const ids = new Set(
          (assignments ?? [])
            .filter((a) => a.field_source === "custom" && a.custom_field_id)
            .map((a) => a.custom_field_id as string)
        );
        if (!cancelled) setFormFieldCustomIds(ids);
      } catch {
        if (!cancelled) setFormFieldCustomIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveFormId]);

  useEffect(() => {
    sessionStorage.setItem(FORM_FILTER_KEY, formFilter);
  }, [formFilter]);

  const displayedCustomFieldsWithValues = useMemo(() => {
    if (formFieldCustomIds === null) return customFieldsWithValues;
    return customFieldsWithValues.filter(({ definition }) => formFieldCustomIds.has(definition.id));
  }, [customFieldsWithValues, formFieldCustomIds]);

  // Search state for MAGs and Lists
  const [magSearch, setMagSearch] = useState("");
  const [magResults, setMagResults] = useState<{ id: string; name: string; uid: string }[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [listResults, setListResults] = useState<{ id: string; name: string; slug: string }[]>([]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const useAccordion = activeSection == null;
  const showNotes = !activeSection || activeSection === "notes";
  const showCustomFields = !activeSection || activeSection === "customFields";
  const showMarketingLists = !activeSection || activeSection === "marketingLists";
  const showMags = !activeSection || activeSection === "mags";

  // Custom field options from definition (select/multiselect)
  const getCustomFieldOptions = (def: CrmCustomField): string[] => {
    const opts = def.validation_rules?.options;
    if (Array.isArray(opts)) return opts.filter((o): o is string => typeof o === "string");
    return [];
  };

  const startEditCustomField = (definition: CrmCustomField, currentValue: string | null) => {
    setEditingCustomFieldId(definition.id);
    setCustomFieldEditValue(currentValue ?? "");
  };

  const cancelEditCustomField = () => {
    setEditingCustomFieldId(null);
    setCustomFieldEditValue("");
  };

  const saveCustomFieldValue = async (definition: CrmCustomField) => {
    setCustomFieldSaving(true);
    try {
      const valueToSave = customFieldEditValue.trim() || null;
      const res = await fetch(`/api/crm/contacts/${contactId}/custom-fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_field_id: definition.id,
          value: valueToSave,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setCustomFieldValues((prev) => ({ ...prev, [definition.id]: valueToSave }));
      setEditingCustomFieldId(null);
      setCustomFieldEditValue("");
    } catch (err) {
      console.error("Error saving custom field:", err);
      // Keep edit mode open; could show toast
    } finally {
      setCustomFieldSaving(false);
    }
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

  // Remove MAG - show confirmation dialog
  const handleRemoveMag = (magId: string, magName: string) => {
    setConfirmRemoveMag({ id: magId, name: magName });
  };

  // Actually perform the MAG removal after confirmation
  const confirmRemoveMagAction = async () => {
    if (!confirmRemoveMag) return;
    setRemovingMag(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mag_id: confirmRemoveMag.id }),
      });
      if (res.ok) {
        setMags((prev) => prev.filter((m) => m.mag_id !== confirmRemoveMag.id));
      }
    } finally {
      setRemovingMag(false);
      setConfirmRemoveMag(null);
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
      {showNotes && (
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
      )}

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

      {/* Confirm Remove Membership Dialog */}
      {confirmRemoveMag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Remove Membership</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong>&quot;{confirmRemoveMag.name}&quot;</strong> from this contact?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmRemoveMag(null)}
                disabled={removingMag}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRemoveMagAction}
                disabled={removingMag}
              >
                {removingMag ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Fields — accordion when full layout, always visible when tabbed */}
      {showCustomFields && (
      <Card className="overflow-hidden">
        {useAccordion ? (
          <>
            <button
              type="button"
              className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
              onClick={() => toggleSection("customFields")}
            >
              <span>Custom Fields</span>
              {openSections.customFields ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {openSections.customFields && (
            <CardContent className="pt-0 px-4 pb-4 space-y-3">
            {customFieldsWithValues.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="custom-fields-form-filter" className="text-xs text-muted-foreground shrink-0">
                  Show fields:
                </Label>
                <Select
                  value={formFilter === "contact" && !contactFormId ? "all" : formFilter}
                  onValueChange={setFormFilter}
                >
                  <SelectTrigger id="custom-fields-form-filter" className="h-8 text-sm max-w-[200px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {contactFormId && initialForms.some((f) => f.id === contactFormId) && (
                      <SelectItem value="contact">Contact&apos;s form</SelectItem>
                    )}
                    {initialForms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {displayedCustomFieldsWithValues.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {customFieldsWithValues.length === 0
                  ? "No custom fields defined. Add custom fields in Settings or Forms."
                  : effectiveFormId
                    ? "No custom fields assigned to this form."
                    : "No custom fields."}
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {displayedCustomFieldsWithValues.map(({ definition, value }) => {
                  const isEditing = editingCustomFieldId === definition.id;
                  const options = getCustomFieldOptions(definition);
                  const isComplexEdit = definition.type === "textarea" || definition.type === "multiselect";
                  return (
                    <div
                      key={definition.id}
                      className="flex items-center gap-2 w-full min-h-8"
                    >
                      <span className="font-medium text-muted-foreground text-xs shrink-0 min-w-[8rem]">
                        {definition.label}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {isEditing ? (
                          isComplexEdit ? (
                            <div className="flex flex-col gap-1.5 w-full min-w-0">
                              {definition.type === "multiselect" && (
                                <div className="flex flex-wrap gap-2 py-1">
                                  {options.map((opt) => {
                                    const selected = customFieldEditValue
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean);
                                    const checked = selected.includes(opt);
                                    return (
                                      <label
                                        key={opt}
                                        className="flex items-center gap-1.5 text-sm cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={(checked) => {
                                            const next = checked
                                              ? [...selected.filter((s) => s !== opt), opt]
                                              : selected.filter((s) => s !== opt);
                                            setCustomFieldEditValue(next.join(", "));
                                          }}
                                        />
                                        {opt}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                              {definition.type === "textarea" && (
                                <textarea
                                  className="flex min-h-[60px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  value={customFieldEditValue}
                                  onChange={(e) => setCustomFieldEditValue(e.target.value)}
                                  rows={3}
                                />
                              )}
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={cancelEditCustomField}
                                  disabled={customFieldSaving}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => saveCustomFieldValue(definition)}
                                  disabled={customFieldSaving}
                                >
                                  {customFieldSaving ? "Saving…" : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {definition.type === "select" && (
                                <Select
                                  value={customFieldEditValue || ""}
                                  onValueChange={setCustomFieldEditValue}
                                >
                                  <SelectTrigger className="h-8 text-sm flex-1 min-w-0">
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">—</SelectItem>
                                    {options.map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {(definition.type === "text" ||
                                definition.type === "email" ||
                                definition.type === "tel" ||
                                definition.type === "url" ||
                                definition.type === "number" ||
                                !["select", "multiselect", "textarea"].includes(definition.type)) && (
                                <Input
                                  className="h-8 text-sm flex-1 min-w-0"
                                  type={definition.type === "number" ? "number" : "text"}
                                  value={customFieldEditValue}
                                  onChange={(e) => setCustomFieldEditValue(e.target.value)}
                                />
                              )}
                              <div className="flex gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={cancelEditCustomField}
                                  disabled={customFieldSaving}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => saveCustomFieldValue(definition)}
                                  disabled={customFieldSaving}
                                >
                                  {customFieldSaving ? "Saving…" : "Save"}
                                </Button>
                              </div>
                            </>
                          )
                        ) : (
                          <>
                            <span className="flex-1 min-w-0 truncate text-sm" title={value ?? undefined}>
                              {value ?? "—"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => startEditCustomField(definition, value)}
                              aria-label={`Edit ${definition.label}`}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </CardContent>
            )}
            </>
          ) : (
            <CardContent className="pt-4 px-4 pb-4 space-y-3">
            {customFieldsWithValues.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="custom-fields-form-filter-tab" className="text-xs text-muted-foreground shrink-0">
                  Show fields:
                </Label>
                <Select
                  value={formFilter === "contact" && !contactFormId ? "all" : formFilter}
                  onValueChange={setFormFilter}
                >
                  <SelectTrigger id="custom-fields-form-filter-tab" className="h-8 text-sm max-w-[200px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {contactFormId && initialForms.some((f) => f.id === contactFormId) && (
                      <SelectItem value="contact">Contact&apos;s form</SelectItem>
                    )}
                    {initialForms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {displayedCustomFieldsWithValues.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {customFieldsWithValues.length === 0
                  ? "No custom fields defined. Add custom fields in Settings or Forms."
                  : effectiveFormId
                    ? "No custom fields assigned to this form."
                    : "No custom fields."}
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {displayedCustomFieldsWithValues.map(({ definition, value }) => {
                  const isEditing = editingCustomFieldId === definition.id;
                  const options = getCustomFieldOptions(definition);
                  const isComplexEdit = definition.type === "textarea" || definition.type === "multiselect";
                  return (
                    <div
                      key={definition.id}
                      className="flex items-center gap-2 w-full min-h-8"
                    >
                      <span className="font-medium text-muted-foreground text-xs shrink-0 min-w-[8rem]">
                        {definition.label}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {isEditing ? (
                          isComplexEdit ? (
                            <div className="flex flex-col gap-1.5 w-full min-w-0">
                              {definition.type === "multiselect" && (
                                <div className="flex flex-wrap gap-2 py-1">
                                  {options.map((opt) => {
                                    const selected = customFieldEditValue
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean);
                                    const checked = selected.includes(opt);
                                    return (
                                      <label
                                        key={opt}
                                        className="flex items-center gap-1.5 text-sm cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={(checked) => {
                                            const next = checked
                                              ? [...selected.filter((s) => s !== opt), opt]
                                              : selected.filter((s) => s !== opt);
                                            setCustomFieldEditValue(next.join(", "));
                                          }}
                                        />
                                        {opt}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                              {definition.type === "textarea" && (
                                <textarea
                                  className="flex min-h-[60px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  value={customFieldEditValue}
                                  onChange={(e) => setCustomFieldEditValue(e.target.value)}
                                  rows={3}
                                />
                              )}
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={cancelEditCustomField}
                                  disabled={customFieldSaving}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => saveCustomFieldValue(definition)}
                                  disabled={customFieldSaving}
                                >
                                  {customFieldSaving ? "Saving…" : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {definition.type === "select" && (
                                <Select
                                  value={customFieldEditValue || ""}
                                  onValueChange={setCustomFieldEditValue}
                                >
                                  <SelectTrigger className="h-8 text-sm flex-1 min-w-0">
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">—</SelectItem>
                                    {options.map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {(definition.type === "text" ||
                                definition.type === "email" ||
                                definition.type === "tel" ||
                                definition.type === "url" ||
                                definition.type === "number" ||
                                !["select", "multiselect", "textarea"].includes(definition.type)) && (
                                <Input
                                  className="h-8 text-sm flex-1 min-w-0"
                                  type={definition.type === "number" ? "number" : "text"}
                                  value={customFieldEditValue}
                                  onChange={(e) => setCustomFieldEditValue(e.target.value)}
                                />
                              )}
                              <div className="flex gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={cancelEditCustomField}
                                  disabled={customFieldSaving}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => saveCustomFieldValue(definition)}
                                  disabled={customFieldSaving}
                                >
                                  {customFieldSaving ? "Saving…" : "Save"}
                                </Button>
                              </div>
                            </>
                          )
                        ) : (
                          <>
                            <span className="flex-1 min-w-0 truncate text-sm" title={value ?? undefined}>
                              {value ?? "—"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => startEditCustomField(definition, value)}
                              aria-label={`Edit ${definition.label}`}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Marketing Lists — accordion when full layout, always visible when tabbed */}
      {showMarketingLists && (
      <Card className="overflow-hidden">
        {useAccordion ? (
          <>
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
            </>
          ) : (
            <CardContent className="pt-4 px-4 pb-4 space-y-2">
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
      )}

      {/* Memberships (MAGs) — accordion when full layout, always visible when tabbed */}
      {showMags && (
      <Card className="overflow-hidden">
        {useAccordion ? (
          <>
            <button
              type="button"
              className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
              onClick={() => toggleSection("mags")}
            >
              <span>Memberships</span>
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
                className="pl-7 pr-8 h-8 text-sm"
              />
              {magSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setMagSearch("");
                    setMagResults([]);
                  }}
                  className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveMag(m.mag_id, m.mag_name)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        )}
            </>
          ) : (
            <CardContent className="pt-4 px-4 pb-4 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search MAGs to add..."
                value={magSearch}
                onChange={(e) => handleMagSearch(e.target.value)}
                className="pl-7 pr-8 h-8 text-sm"
              />
              {magSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setMagSearch("");
                    setMagResults([]);
                  }}
                  className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveMag(m.mag_id, m.mag_name)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}
