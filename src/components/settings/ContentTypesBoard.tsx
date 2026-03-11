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
import { Layers, Edit, Trash2, Loader2, Plus, ArrowUpDown, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Save } from "lucide-react";

const SORT_STORAGE_KEY = "contentTypesBoard_sort";

type SortBy = "label" | "display_order";
type SortDir = "asc" | "desc";

function loadSortPreference(): { sortBy: SortBy; sortDir: SortDir } {
  if (typeof window === "undefined") return { sortBy: "display_order", sortDir: "asc" };
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { sortBy?: string; sortDir?: string };
      if (parsed.sortBy === "label" || parsed.sortBy === "display_order") {
        const dir = parsed.sortDir === "desc" ? "desc" : "asc";
        return { sortBy: parsed.sortBy, sortDir: dir };
      }
    }
  } catch {
    // ignore
  }
  return { sortBy: "display_order", sortDir: "asc" };
}

function saveSortPreference(sortBy: SortBy, sortDir: SortDir) {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ sortBy, sortDir }));
  } catch {
    // ignore
  }
}

export function ContentTypesBoard() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentType | null>(null);
  const [form, setForm] = useState({ slug: "", label: "", description: "", display_order: 0 });
  const [sortBy, setSortBy] = useState<SortBy>(() => loadSortPreference().sortBy);
  const [sortDir, setSortDir] = useState<SortDir>(() => loadSortPreference().sortDir);
  /** When sorted by display_order, this is the reorderable id list. Save Sort Order writes these as display_order 0,1,2,... */
  const [orderIds, setOrderIds] = useState<string[]>([]);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getContentTypes();
      setTypes(t);
      const byOrder = [...t].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || (a.slug ?? "").localeCompare(b.slug ?? ""));
      setOrderIds(byOrder.map((x) => x.id));
    } catch (e) {
      console.error("Failed to fetch content types:", e);
      setTypes([]);
      setOrderIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const typesForDisplay = types;

  const sorted =
    sortBy === "display_order"
      ? (sortDir === "asc"
          ? orderIds.map((id) => typesForDisplay.find((t) => t.id === id)).filter(Boolean)
          : [...orderIds].reverse().map((id) => typesForDisplay.find((t) => t.id === id)).filter(Boolean)) as ContentType[]
      : [...typesForDisplay].sort((a, b) => {
          const mult = sortDir === "asc" ? 1 : -1;
          return mult * (a.label ?? "").localeCompare(b.label ?? "", undefined, { sensitivity: "base" });
        });

  const toggleSort = (column: SortBy) => {
    const nextBy = column;
    const nextDir = sortBy === column ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortBy(nextBy);
    setSortDir(nextDir);
    saveSortPreference(nextBy, nextDir);
  };

  const moveOrder = (tableIndex: number, direction: -1 | 1) => {
    const orderIndex = sortDir === "asc" ? tableIndex : orderIds.length - 1 - tableIndex;
    const next = orderIndex + direction;
    if (next < 0 || next >= orderIds.length) return;
    setOrderIds((prev) => {
      const arr = [...prev];
      [arr[orderIndex], arr[next]] = [arr[next], arr[orderIndex]];
      return arr;
    });
  };

  /** Saves the current visible order (Label or Display Order) as display_order 0, 1, 2, ... */
  const handleSaveSortOrder = async () => {
    setSavingOrder(true);
    try {
      for (let i = 0; i < sorted.length; i++) {
        await updateContentType(sorted[i].id, { display_order: i });
      }
      await fetchTypes();
    } catch (e) {
      console.error("Save sort order failed:", e);
      alert("Failed to save order. Try again.");
    } finally {
      setSavingOrder(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ slug: "", label: "", description: "", display_order: 0 });
    setModalOpen(true);
  };

  const openEdit = (t: ContentType) => {
    setEditing(t);
    setForm({
      slug: t.slug,
      label: t.label,
      description: t.description ?? "",
      display_order: t.display_order ?? 0,
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
        const payload: Parameters<typeof updateContentType>[1] = {
          label: form.label.trim(),
          description: form.description?.trim() || null,
          display_order: Number(form.display_order) ?? 0,
        };
        if (!editing.is_core) payload.slug = form.slug.trim();
        const ok = await updateContentType(editing.id, payload);
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
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Content Types
              </CardTitle>
              <CardDescription className="space-y-1">
                <span className="block">The sort order you set here (by display order or label) is how types appear in the <strong>New Content</strong> picker on the Content page.</span>
                <span className="block">Core types (post, article, snippet, quote, FAQ, etc.) can be edited (label, description, display order) but not deleted; slug is fixed for core types.</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleSaveSortOrder} disabled={savingOrder || sorted.length === 0} title="Save the current order (by label or order) as the display order used in the New Content picker">
                {savingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Sort Order
              </Button>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
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
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 -ml-2 font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => toggleSort("label")}
                      >
                        Label {sortBy === "label" ? (sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />) : <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-50" />}
                      </Button>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Slug</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 -ml-2 font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => toggleSort("display_order")}
                      >
                        Order {sortBy === "display_order" ? (sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />) : <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-50" />}
                      </Button>
                    </th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t, index) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 text-sm font-medium">{t.label}</td>
                      <td className="px-3 py-2 text-sm font-mono">{t.slug}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{t.description ?? "—"}</td>
                      <td className="px-3 py-2 text-sm font-mono text-muted-foreground">{t.display_order ?? 0}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {sortBy === "display_order" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveOrder(index, -1)}
                                disabled={sortDir === "asc" ? index === 0 : index === sorted.length - 1}
                                aria-label="Move up"
                                title="Move up"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveOrder(index, 1)}
                                disabled={sortDir === "asc" ? index === sorted.length - 1 : index === 0}
                                aria-label="Move down"
                                title="Move down"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                            aria-label="Edit"
                            title="Edit (label, description, order)"
                          >
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
            {editing !== null && (
              <div className="space-y-2">
                <Label htmlFor="ct-display-order">Display order</Label>
                <Input
                  id="ct-display-order"
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_order: parseInt(e.target.value, 10) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">Lower numbers appear first in the New Content picker.</p>
              </div>
            )}
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
    </>
  );
}
