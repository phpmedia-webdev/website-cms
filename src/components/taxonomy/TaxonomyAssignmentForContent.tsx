"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getTaxonomyTermsClient,
  getSectionConfigsClient,
  getTermsForContentSection,
  getTaxonomyForContent,
  setTaxonomyForContent,
} from "@/lib/supabase/taxonomy";
import type { TaxonomyTerm } from "@/types/taxonomy";

interface TaxonomyAssignmentForContentProps {
  contentId: string;
  /** Stored in taxonomy_relationships.content_type (e.g. post, crm_contact). */
  contentTypeSlug: string;
  /** Section for term filtering (section_taxonomy_config.section_name). If omitted, contentTypeSlug is used. */
  section?: string;
  sectionLabel?: string;
  compact?: boolean;
  onSaved?: () => void;
  disabled?: boolean;
  /**
   * Embedded mode: no separate Save button. Parent saves taxonomy with main Update.
   * Requires selectedCategoryIds, selectedTagIds, onCategoryToggle, onTagToggle, onInitialLoad.
   */
  embedded?: boolean;
  selectedCategoryIds?: Set<string>;
  selectedTagIds?: Set<string>;
  onCategoryToggle?: (id: string, checked: boolean) => void;
  onTagToggle?: (id: string, checked: boolean) => void;
  onInitialLoad?: (payload: { categoryIds: string[]; tagIds: string[] }) => void;
}

/**
 * Categories & tags assignment for unified content (post, page, portfolio, etc.).
 * Section = content_types.slug; terms are filtered by that section.
 * Use embedded=true in Content edit modal so Update saves content + taxonomy together.
 */
export function TaxonomyAssignmentForContent({
  contentId,
  contentTypeSlug,
  section: sectionProp,
  sectionLabel,
  compact = false,
  onSaved,
  disabled = false,
  embedded = false,
  selectedCategoryIds: controlledCategoryIds,
  selectedTagIds: controlledTagIds,
  onCategoryToggle: controlledCategoryToggle,
  onTagToggle: controlledTagToggle,
  onInitialLoad,
}: TaxonomyAssignmentForContentProps) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [configs, setConfigs] = useState<Awaited<ReturnType<typeof getSectionConfigsClient>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [internalCategoryIds, setInternalCategoryIds] = useState<Set<string>>(new Set());
  const [internalTagIds, setInternalTagIds] = useState<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<string | null>(null);

  const section = sectionProp ?? contentTypeSlug;
  const displaySection = sectionLabel ?? section;
  const { categories, tags } = getTermsForContentSection(terms, configs, section);

  const selectedCategoryIds = embedded && controlledCategoryIds ? controlledCategoryIds : internalCategoryIds;
  const selectedTagIds = embedded && controlledTagIds ? controlledTagIds : internalTagIds;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [t, c] = await Promise.all([
          getTaxonomyTermsClient(),
          getSectionConfigsClient(),
        ]);
        setTerms(t);
        setConfigs(c);
      } catch (e) {
        console.error("TaxonomyAssignmentForContent load terms/configs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!contentId || !contentTypeSlug || loading) return;
    const key = `${contentId}:${contentTypeSlug}`;
    if (embedded && initialLoadDoneRef.current === key) return;
    getTaxonomyForContent(contentId, contentTypeSlug).then(({ categoryIds, tagIds }) => {
      if (embedded && onInitialLoad) {
        onInitialLoad({ categoryIds, tagIds });
        initialLoadDoneRef.current = key;
      } else {
        setInternalCategoryIds(new Set(categoryIds));
        setInternalTagIds(new Set(tagIds));
      }
    });
  }, [contentId, contentTypeSlug, loading, embedded, onInitialLoad]);

  const handleCategoryToggle = (id: string, checked: boolean) => {
    if (embedded && controlledCategoryToggle) {
      controlledCategoryToggle(id, checked);
      return;
    }
    setInternalCategoryIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleTagToggle = (id: string, checked: boolean) => {
    if (embedded && controlledTagToggle) {
      controlledTagToggle(id, checked);
      return;
    }
    setInternalTagIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (embedded) return;
    setSaving(true);
    try {
      const allIds = [...selectedCategoryIds, ...selectedTagIds];
      await setTaxonomyForContent(contentId, contentTypeSlug, allIds);
      onSaved?.();
    } catch (e) {
      console.error("TaxonomyAssignmentForContent save:", e);
      alert("Failed to save categories and tags.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading categories and tags…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Categories</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Section &quot;{displaySection}&quot; — select categories for this item.
        </p>
        <div className="space-y-2 border rounded-md p-3 max-h-36 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories defined for this section.</p>
          ) : (
            categories.map((term) => (
              <label key={term.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.has(term.id)}
                  onChange={(e) => handleCategoryToggle(term.id, e.target.checked)}
                  disabled={disabled}
                  className="rounded"
                />
                <span className="text-sm">{term.name}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium">Tags</Label>
        <div className="space-y-2 border rounded-md p-3 max-h-36 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags defined for this section.</p>
          ) : (
            tags.map((term) => (
              <label key={term.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(term.id)}
                  onChange={(e) => handleTagToggle(term.id, e.target.checked)}
                  disabled={disabled}
                  className="rounded"
                />
                <span className="text-sm">{term.name}</span>
              </label>
            ))
          )}
        </div>
      </div>
      {!embedded && (
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving || disabled}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Categories & Tags"
          )}
        </Button>
      )}
    </div>
  );
}
