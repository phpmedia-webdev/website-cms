"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getContentTypes, getContentListWithTypes, deleteContent } from "@/lib/supabase/content";
import {
  getTaxonomyTermsClient,
  getContentTaxonomyRelationships,
} from "@/lib/supabase/taxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaxonomyMultiSelect, type TaxonomyMultiSelectOption } from "@/components/media/TaxonomyMultiSelect";
import type { ContentListItem, ContentType } from "@/types/content";
import type { TaxonomyTerm } from "@/types/taxonomy";
import { Plus, Search, Edit, Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export function ContentPageClient() {
  const router = useRouter();
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
  const [filterMembershipOnly, setFilterMembershipOnly] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

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
    const matchMembership =
      !filterMembershipOnly || c.access_level === "members" || c.access_level === "mag";
    return matchSearch && matchType && matchTaxonomy && matchMembership;
  });

  const hasFilters =
    search.trim().length > 0 ||
    !!typeFilter ||
    selectedCategoryIds.size > 0 ||
    selectedTagIds.size > 0 ||
    filterMembershipOnly;

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setSelectedCategoryIds(new Set());
    setSelectedTagIds(new Set());
    setFilterMembershipOnly(false);
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
    setAddModalOpen(true);
  };

  const handleSelectTypeForNew = (typeSlug: string) => {
    setAddModalOpen(false);
    router.push(`/admin/content/new?type=${encodeURIComponent(typeSlug)}`);
  };

  const handleEdit = (c: ContentListItem) => {
    router.push(`/admin/content/${c.id}/edit`);
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
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
              <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Choose content type</DialogTitle>
                  <DialogDescription>
                    Select the type of content you want to create. This cannot be changed after creation.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2 min-h-[320px] max-h-[min(70vh,520px)] overflow-y-auto">
                  {contentTypesForLibrary.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No content types available.</p>
                  ) : (
                    contentTypesForLibrary.map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        className="h-auto w-full justify-start py-3 px-4 text-left"
                        onClick={() => handleSelectTypeForNew(t.slug)}
                      >
                        <span className="flex min-w-0 w-full flex-col items-start gap-1.5 text-left">
                          <span className="font-medium">{t.label}</span>
                          {t.description ? (
                            <span className="text-sm text-muted-foreground font-normal break-words text-balance">
                              {t.description}
                            </span>
                          ) : null}
                        </span>
                      </Button>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
              <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                <Checkbox
                  id="filter-membership"
                  checked={filterMembershipOnly}
                  onCheckedChange={(checked) => setFilterMembershipOnly(checked === true)}
                />
                <span>Is Membership</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 ml-auto shrink-0"
                onClick={handleResetFilters}
                disabled={!hasFilters}
                title="Reset search, type, taxonomy, and membership filters"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Filters
              </Button>
            </div>
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
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground" title="Membership restricted">
                        Membership
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
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          Loading…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
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
                          <td className="px-3 py-1.5">
                            {(c.access_level === "members" || c.access_level === "mag") ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-700 font-semibold text-xs dark:bg-red-900/40 dark:text-red-300"
                                title="Membership restricted"
                              >
                                M
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
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

    </div>
  );
}
