"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getTaxonomyTermsClient,
  getSectionConfigsClient,
  getTermsForMediaSection,
  getTaxonomyForMedia,
  setTaxonomyForMedia,
  getMediaSectionForType,
} from "@/lib/supabase/taxonomy";
import type { TaxonomyTerm } from "@/types/taxonomy";

interface TaxonomyAssignmentProps {
  mediaId: string;
  mediaType: "image" | "video";
  onSaved?: () => void;
  disabled?: boolean;
}

export function TaxonomyAssignment({
  mediaId,
  mediaType,
  onSaved,
  disabled = false,
}: TaxonomyAssignmentProps) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [configs, setConfigs] = useState<Awaited<ReturnType<typeof getSectionConfigsClient>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const section = getMediaSectionForType(mediaType);
  const { categories, tags } = getTermsForMediaSection(terms, configs, section);

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
        console.error("TaxonomyAssignment load terms/configs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!mediaId || loading) return;
    getTaxonomyForMedia(mediaId).then(({ categoryIds, tagIds }) => {
      setSelectedCategoryIds(new Set(categoryIds));
      setSelectedTagIds(new Set(tagIds));
    });
  }, [mediaId, loading]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const allIds = [...selectedCategoryIds, ...selectedTagIds];
      await setTaxonomyForMedia(mediaId, allIds);
      onSaved?.();
    } catch (e) {
      console.error("TaxonomyAssignment save:", e);
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
          Section &quot;{section === "image" ? "Image" : "Video"}&quot; — select categories for this item.
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
    </div>
  );
}
