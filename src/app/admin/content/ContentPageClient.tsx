"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getContentTypes, getContentListWithTypes, getContentById, deleteContent } from "@/lib/supabase/content";
import {
  getTaxonomyTermsClient,
  getContentTaxonomyRelationships,
} from "@/lib/supabase/taxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentEditModal } from "@/components/content/ContentEditModal";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "@/components/media/TaxonomyMultiSelect";
import type { ContentListItem, ContentType, ContentRow } from "@/types/content";
import type { TaxonomyTerm } from "@/types/taxonomy";
import { Plus, Search, Edit, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export function ContentPageClient() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ContentListItem[]>([]);
  const [types, setTypes] = useState<ContentType[]>([]);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [relationships, setRelationships] = useState<{ content_id: string; content_type: string; term_id: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type) setTypeFilter(type);
  }, [searchParams]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [t, list] = await Promise.all([getContentTypes(), getContentListWithTypes()]);
      setTypes(t);
      setItems(list);
    } catch (e) {
      console.error("Failed to fetch content:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    getTaxonomyTermsClient().then(setTerms).catch(() => setTerms([]));
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setRelationships([]);
      return;
    }
    getContentTaxonomyRelationships(items.map((c) => c.id)).then(setRelationships).catch(() => setRelationships([]));
  }, [items]);

  const filterCategories: TaxonomyMultiSelectOption[] = terms
    .filter((t) => t.type === "category")
    .map((t) => ({ id: t.id, name: t.name }));
  const filterTags: TaxonomyMultiSelectOption[] = terms
    .filter((t) => t.type === "tag")
    .map((t) => ({ id: t.id, name: t.name }));

  // Exclude "page" from content library: structure is built in code, not as content type (per product decision).
  const contentTypesForLibrary = types.filter((t) => t.slug !== "page");
  const contentItemsForLibrary = items.filter((c) => c.type_slug !== "page");

  const termFilterIds = [...selectedCategoryIds, ...selectedTagIds];
  const contentIdsWithTerms =
    termFilterIds.length === 0
      ? null
      : new Set(
          relationships.filter((r) => termFilterIds.includes(r.term_id)).map((r) => r.content_id)
        );

  const filtered = contentItemsForLibrary.filter((c) => {
    const matchSearch =
      !search.trim() ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.slug?.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || c.type_slug === typeFilter;
    const matchTaxonomy = !contentIdsWithTerms || contentIdsWithTerms.has(c.id);
    return matchSearch && matchType && matchTaxonomy;
  });

  const hasFilters =
    search.trim().length > 0 ||
    !!typeFilter ||
    selectedCategoryIds.size > 0 ||
    selectedTagIds.size > 0;

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setSelectedCategoryIds(new Set());
    setSelectedTagIds(new Set());
  };

  const handleCategoryToggle = (id: string, checked: boolean) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleTagToggle = (id: string, checked: boolean) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = async (c: ContentListItem) => {
    const row = await getContentById(c.id);
    if (!row) {
      alert("Could not load content.");
      return;
    }
    setEditing(row);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    fetchItems();
    handleModalClose();
  };

  const handleDelete = async (c: ContentListItem) => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    setDeleting(true);
    try {
      const ok = await deleteContent(c.id);
      if (!ok) throw new Error("Delete failed");
      await fetchItems();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content</h1>
        <p className="text-muted-foreground mt-2">
          Manage posts and other content. Search and filter below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All content</CardTitle>
              <CardDescription>
                Add, edit, or remove content. Filter by type or search by name/slug.
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(filterCategories.length > 0 || filterTags.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {filterCategories.length > 0 && (
                  <TaxonomyMultiSelect
                    label="Categories"
                    options={filterCategories}
                    selectedIds={selectedCategoryIds}
                    onToggle={handleCategoryToggle}
                    placeholder="All categories"
                  />
                )}
                {filterTags.length > 0 && (
                  <TaxonomyMultiSelect
                    label="Tags"
                    options={filterTags}
                    selectedIds={selectedTagIds}
                    onToggle={handleTagToggle}
                    placeholder="All tags"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleResetFilters}
                  disabled={!hasFilters}
                  title="Reset search, type, and taxonomy filters"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Filters
                </Button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or slug…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-[180px] px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="">All types</option>
                {contentTypesForLibrary.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Title
                      </th>
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Updated
                      </th>
                      <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          Loading…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {hasFilters
                            ? "No content matches your search and filters."
                            : "No content yet. Add your first item."}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((c) => (
                        <tr key={c.id} className="border-t hover:bg-accent">
                          <td className="px-3 py-1.5 text-xs text-muted-foreground">
                            {c.type_label}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="font-medium">{c.title || c.slug || "—"}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs ${
                                c.status === "published"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-xs text-muted-foreground">
                            {c.updated_at
                              ? format(new Date(c.updated_at), "MMM d, yyyy")
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEdit(c)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(c)}
                                disabled={deleting}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ContentEditModal
        open={modalOpen}
        onClose={handleModalClose}
        item={editing}
        types={contentTypesForLibrary}
        onSaved={handleSaved}
      />
    </div>
  );
}
