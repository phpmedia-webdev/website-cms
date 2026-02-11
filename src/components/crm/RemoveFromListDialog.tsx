"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MarketingList } from "@/lib/supabase/crm";

interface RemoveFromListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  marketingLists: MarketingList[];
  onSuccess?: () => void;
}

export function RemoveFromListDialog({
  open,
  onOpenChange,
  selectedIds,
  marketingLists: marketingListsProp,
  onSuccess,
}: RemoveFromListDialogProps) {
  const [marketingLists, setMarketingLists] = useState<MarketingList[]>(marketingListsProp);
  const [listId, setListId] = useState("");
  const [loading, setLoading] = useState(false);
  const [listsLoading, setListsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setListsLoading(true);
    fetch("/api/crm/lists")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: MarketingList[]) => setMarketingLists(Array.isArray(data) ? data : []))
      .catch(() => setMarketingLists([]))
      .finally(() => setListsLoading(false));
  }, [open]);

  const handleRemove = useCallback(async () => {
    if (!listId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/lists/bulk-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selectedIds), listId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      onSuccess?.();
      onOpenChange(false);
      setListId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove from list");
    } finally {
      setLoading(false);
    }
  }, [listId, selectedIds, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from list</DialogTitle>
          <DialogDescription>
            Remove {selectedIds.size.toLocaleString()} selected contact
            {selectedIds.size !== 1 ? "s" : ""} from a marketing list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Marketing list</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            aria-label="Choose marketing list"
            disabled={listsLoading}
          >
            <option value="">
              {listsLoading ? "Loading lists…" : "Select a list…"}
            </option>
            {marketingLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          {!listsLoading && marketingLists.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No marketing lists yet. Create one under CRM → Marketing Lists.
            </p>
          )}
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
            variant="destructive"
            disabled={!listId || loading}
            onClick={handleRemove}
          >
            {loading ? "Removing…" : "Remove from list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
