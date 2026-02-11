"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TaxonomyTerm } from "@/types/taxonomy";

interface TaxonomyBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  categories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
  onSuccess?: () => void;
}

export function TaxonomyBulkDialog({
  open,
  onOpenChange,
  selectedIds,
  categories,
  tags,
  onSuccess,
}: TaxonomyBulkDialogProps) {
  const [termId, setTermId] = useState("");
  const [operation, setOperation] = useState<"add" | "remove">("add");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!termId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/taxonomy/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          termId,
          operation,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      onSuccess?.();
      onOpenChange(false);
      setTermId("");
      setOperation("add");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update taxonomy");
    } finally {
      setLoading(false);
    }
  }, [termId, operation, selectedIds, onSuccess, onOpenChange]);

  const hasTerms = categories.length > 0 || tags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Taxonomy</DialogTitle>
          <DialogDescription>
            Add or remove one category or tag for {selectedIds.size.toLocaleString()} selected
            contact{selectedIds.size !== 1 ? "s" : ""}. Pick a single term and the operation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category or tag</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              aria-label="Choose category or tag"
              disabled={loading}
            >
              <option value="">Select category or tag…</option>
              {categories.length > 0 && (
                <optgroup label="Categories">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {tags.length > 0 && (
                <optgroup label="Tags">
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {!hasTerms && (
              <p className="text-xs text-muted-foreground">
                No CRM categories or tags. Configure in Settings → Taxonomy.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Operation</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taxonomy-op"
                  checked={operation === "add"}
                  onChange={() => setOperation("add")}
                  disabled={loading}
                  className="rounded-full border-input"
                />
                <span className="text-sm">Add to selected contacts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taxonomy-op"
                  checked={operation === "remove"}
                  onChange={() => setOperation("remove")}
                  disabled={loading}
                  className="rounded-full border-input"
                />
                <span className="text-sm">Remove from selected contacts</span>
              </label>
            </div>
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!termId || loading}
            onClick={handleSubmit}
          >
            {loading ? "Updating…" : operation === "add" ? "Add to contacts" : "Remove from contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
