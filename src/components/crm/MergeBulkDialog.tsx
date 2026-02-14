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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

export interface MergeContactOption {
  id: string;
  displayName: string;
}

interface MergeBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Exactly two contacts; user picks which to keep (primary) and which to merge in (secondary). */
  contactA: MergeContactOption;
  contactB: MergeContactOption;
  onSuccess?: () => void;
}

/** Bulk merge: choose which of the two selected contacts to keep; the other is merged into it. Dire warning, not reversible. */
export function MergeBulkDialog({
  open,
  onOpenChange,
  contactA,
  contactB,
  onSuccess,
}: MergeBulkDialogProps) {
  const [primaryId, setPrimaryId] = useState<string>(contactA.id);
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrimaryId(contactA.id);
      setUnderstood(false);
      setError(null);
    }
  }, [open, contactA.id]);

  const handleMerge = useCallback(async () => {
    if (!primaryId || !understood) return;
    const secondaryId = primaryId === contactA.id ? contactB.id : contactA.id;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Merge failed");
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setLoading(false);
    }
  }, [primaryId, understood, contactA.id, contactB.id, onSuccess, onOpenChange]);

  const canMerge = primaryId && understood && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Merge 2 contacts
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left">
              <p className="font-semibold text-destructive">
                This action is not reversible.
              </p>
              <p className="text-sm text-muted-foreground">
                Choose which contact to keep. The other will be merged into it and then moved to trash. All notes, form submissions, memberships, and other data from both will be combined into the kept contact. You cannot undo this.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-sm font-medium">Keep this contact (the other will be merged into it)</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/50 has-[:checked]:ring-2 has-[:checked]:ring-ring">
                <input
                  type="radio"
                  name="merge-primary"
                  value={contactA.id}
                  checked={primaryId === contactA.id}
                  onChange={() => setPrimaryId(contactA.id)}
                  className="h-4 w-4"
                />
                <span className="font-medium">{contactA.displayName}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/50 has-[:checked]:ring-2 has-[:checked]:ring-ring">
                <input
                  type="radio"
                  name="merge-primary"
                  value={contactB.id}
                  checked={primaryId === contactB.id}
                  onChange={() => setPrimaryId(contactB.id)}
                  className="h-4 w-4"
                />
                <span className="font-medium">{contactB.displayName}</span>
              </label>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="merge-bulk-understood"
              checked={understood}
              onCheckedChange={(v) => setUnderstood(v === true)}
            />
            <Label htmlFor="merge-bulk-understood" className="text-sm font-normal cursor-pointer">
              I understand this action cannot be undone.
            </Label>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleMerge} disabled={!canMerge}>
            {loading ? "Merging…" : "Merge permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
