"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getContentTypes,
  getContentTypeFields,
  insertContentTypeField,
  updateContentTypeField,
  deleteContentTypeField,
} from "@/lib/supabase/content";
import type { ContentType, ContentTypeField } from "@/types/content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListTree, Plus, Edit, Trash2, Search, Loader2 } from "lucide-react";

const FIELD_TYPES = ["text", "number", "textarea", "checkbox"] as const;

function slugFromLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function ContentFieldsSettingsPage() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [fields, setFields] = useState<ContentTypeField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentTypeField | null>(null);
  const [form, setForm] = useState({
    content_type_id: "",
    key: "",
    label: "",
    type: "text" as string,
    config: "{}",
    display_order: 0,
  });
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([getContentTypes(), getContentTypeFields()]);
      setTypes(t);
      setFields(f);
    } catch (e) {
      console.error("Failed to fetch content fields / types:", e);
      setTypes([]);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = fields.filter((f) => {
    const typeMatch = typeFilter === "all" || f.content_type_id === typeFilter;
    const label = types.find((t) => t.id === f.content_type_id)?.label ?? "";
    const q = search.trim().toLowerCase();
    const searchMatch = !q || f.key.toLowerCase().includes(q) || f.label.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    return typeMatch && searchMatch;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      content_type_id: types[0]?.id ?? "",
      key: "",
      label: "",
      type: "text",
      config: "{}",
      display_order: fields.filter((f) => f.content_type_id === (types[0]?.id ?? "")).length,
    });
    setKeyManuallyEdited(false);
    setModalOpen(true);
  };

  const openEdit = (f: ContentTypeField) => {
    setEditing(f);
    setForm({
      content_type_id: f.content_type_id,
      key: f.key,
      label: f.label,
      type: f.type,
      config: f.config && typeof f.config === "object" ? JSON.stringify(f.config, null, 2) : "{}",
      display_order: f.display_order,
    });
    setKeyManuallyEdited(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) {
      setModalOpen(false);
      setEditing(null);
    }
  };

  const onLabelChange = (label: string) => {
    setForm((prev) => ({ ...prev, label }));
    if (!editing && !keyManuallyEdited && label) {
      setForm((prev) => ({ ...prev, key: slugFromLabel(label) }));
    }
  };

  const handleSave = async () => {
    if (!form.content_type_id?.trim() || !form.key?.trim() || !form.label?.trim()) {
      alert("Content type, key, and label are required.");
      return;
    }
    let configObj: Record<string, unknown> = {};
    if (form.config?.trim()) {
      try {
        configObj = JSON.parse(form.config) as Record<string, unknown>;
      } catch {
        alert("Config must be valid JSON.");
        return;
      }
    }
    const order = Number(form.display_order);
    if (Number.isNaN(order) || order < 0) {
      alert("Display order must be a non‑negative number.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const ok = await updateContentTypeField(editing.id, {
          key: form.key.trim(),
          label: form.label.trim(),
          type: form.type,
          config: configObj,
          display_order: order,
        });
        if (!ok) throw new Error("Update failed");
      } else {
        const inserted = await insertContentTypeField({
          content_type_id: form.content_type_id,
          key: form.key.trim(),
          label: form.label.trim(),
          type: form.type,
          config: configObj,
          display_order: order,
        });
        if (!inserted) throw new Error("Insert failed");
      }
      await fetch();
      closeModal();
    } catch (e) {
      console.error("Content field save failed:", e);
      alert("Failed to save. Check key uniqueness (per content type) and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: ContentTypeField) => {
    if (!confirm(`Delete field "${f.label}" (${f.key})?`)) return;
    try {
      const ok = await deleteContentTypeField(f.id);
      if (!ok) throw new Error("Delete failed");
      await fetch();
    } catch (e) {
      console.error("Delete content type field failed:", e);
      alert("Failed to delete.");
    }
  };

  const typeLabel = (id: string) => types.find((t) => t.id === id)?.label ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Fields</h1>
        <p className="text-muted-foreground mt-2">
          Add and manage custom fields per content type. Each field applies to a single content type.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTree className="h-5 w-5" />
            Content Fields
          </CardTitle>
          <CardDescription>
            Define custom fields (e.g. price, sqft, rooms) per content type. Key must be unique within a content type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by key, label, or type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add field
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No fields found. Add a field or adjust filters.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Content type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Key</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Label</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Order</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="px-3 py-2 text-sm">{typeLabel(f.content_type_id)}</td>
                      <td className="px-3 py-2 text-sm font-mono">{f.key}</td>
                      <td className="px-3 py-2 text-sm font-medium">{f.label}</td>
                      <td className="px-3 py-2 text-sm">{f.type}</td>
                      <td className="px-3 py-2 text-sm">{f.display_order}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(f)} aria-label="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit field" : "Add field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Choose Content Type to apply Field</Label>
              {editing ? (
                <p className="text-sm text-muted-foreground">{typeLabel(form.content_type_id)}</p>
              ) : (
                <Select
                  value={form.content_type_id}
                  onValueChange={(v) => {
                    const nextOrder = fields.filter((f) => f.content_type_id === v).length;
                    setForm((prev) => ({ ...prev, content_type_id: v, display_order: nextOrder }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-label">Label</Label>
              <Input
                id="field-label"
                value={form.label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="e.g. Price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-key">Key</Label>
              <Input
                id="field-key"
                value={form.key}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, key: e.target.value }));
                  setKeyManuallyEdited(true);
                }}
                placeholder="e.g. price"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Unique per content type. Used in custom_fields.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-config">Config (JSON)</Label>
              <textarea
                id="field-config"
                value={form.config}
                onChange={(e) => setForm((prev) => ({ ...prev, config: e.target.value }))}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder='{}'
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-order">Display order</Label>
              <Input
                id="field-order"
                type="number"
                min={0}
                value={form.display_order}
                onChange={(e) => setForm((prev) => ({ ...prev, display_order: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
