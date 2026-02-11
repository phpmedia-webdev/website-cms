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

interface ConfirmEmptyTrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trashedCount: number;
  onSuccess?: () => void;
}

/** Confirmation dialog for permanently purging all trashed contacts. Dire warning. */
export function ConfirmEmptyTrashDialog({
  open,
  onOpenChange,
  trashedCount,
  onSuccess,
}: ConfirmEmptyTrashDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/purge-trash", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to empty trash");
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Empty trash</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Permanently delete all {trashedCount.toLocaleString()} trashed contact
                {trashedCount !== 1 ? "s" : ""}? This cannot be undone.
              </p>
              <p className="font-medium text-foreground">
                There is no recovery. All notes, custom field values, and list memberships for these contacts will be removed.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? "Deleting…" : "Empty trash permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
