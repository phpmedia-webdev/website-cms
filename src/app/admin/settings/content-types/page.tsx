"use client";

import { useState, useEffect, useCallback } from "react";
import { getContentTypes, insertContentType, updateContentType, deleteContentType } from "@/lib/supabase/content";
import type { ContentType } from "@/types/content";
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
import { Layers, Edit, Trash2, Loader2, Plus } from "lucide-react";

export default function ContentTypesSettingsPage() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentType | null>(null);
  const [form, setForm] = useState({ slug: "", label: "", description: "" });

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getContentTypes();
      setTypes(t);
    } catch (e) {
      console.error("Failed to fetch content types:", e);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const sorted = [...types].sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", undefined, { sensitivity: "base" }));

  const openAdd = () => {
    setEditing(null);
    setForm({ slug: "", label: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (t: ContentType) => {
    setEditing(t);
    setForm({
      slug: t.slug,
      label: t.label,
      description: t.description ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) {
      setModalOpen(false);
      setEditing(null);
    }
  };

  const handleSave = async () => {
    if (!form.label?.trim() || !form.slug?.trim()) {
      alert("Label and slug are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const ok = await updateContentType(editing.id, {
          slug: form.slug.trim(),
          label: form.label.trim(),
          description: form.description?.trim() || null,
        });
        if (!ok) throw new Error("Update failed");
      } else {
        const inserted = await insertContentType({
          slug: form.slug.trim(),
          label: form.label.trim(),
          description: form.description?.trim() || null,
        });
        if (!inserted) throw new Error("Insert failed");
      }
      await fetchTypes();
      closeModal();
    } catch (e) {
      console.error("Content type save failed:", e);
      alert(editing ? "Failed to update. Check slug uniqueness and try again." : "Failed to add. Slug may already exist.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: ContentType) => {
    if (t.is_core) {
      alert("Core content types cannot be deleted.");
      return;
    }
    if (!confirm(`Delete content type "${t.label}" (${t.slug})? Content and fields using this type may be affected.`))
      return;
    try {
      const ok = await deleteContentType(t.id);
      if (!ok) throw new Error("Delete failed");
      await fetchTypes();
    } catch (e) {
      console.error("Delete content type failed:", e);
      alert("Failed to delete. It may be in use by content or fields.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Types</h1>
        <p className="text-muted-foreground mt-2">
          Add and manage content types (core and custom). Seeded types appear below.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Content Types
              </CardTitle>
              <CardDescription>
                Core types (post, page, snippet, quote, article) are seeded by default. Sorted alphabetically by label.
              </CardDescription>
            </div>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No content types found. Run migration 044 (seed_content_types) and ensure the content schema is correct.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Label</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Slug</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 text-sm font-medium">{t.label}</td>
                      <td className="px-3 py-2 text-sm font-mono">{t.slug}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{t.description ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} aria-label="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(t)}
                            aria-label="Delete"
                            disabled={t.is_core}
                            title={t.is_core ? "Core types cannot be deleted" : "Delete"}
                          >
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit content type" : "Add content type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ct-label">Label</Label>
              <Input
                id="ct-label"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Blog Post"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-slug">Slug</Label>
              <Input
                id="ct-slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g. post"
                className="font-mono"
                readOnly={editing?.is_core ?? false}
              />
              {editing?.is_core && (
                <p className="text-xs text-muted-foreground">Slug cannot be changed for core types.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-desc">Description</Label>
              <Input
                id="ct-desc"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional"
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
