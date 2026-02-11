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
import type { CrmContactStatusOption } from "@/lib/supabase/settings";

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  contactStatuses: CrmContactStatusOption[];
  onSuccess?: () => void;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  selectedIds,
  contactStatuses,
  onSuccess,
}: ChangeStatusDialogProps) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!status) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selectedIds), status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      onSuccess?.();
      onOpenChange(false);
      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change status");
    } finally {
      setLoading(false);
    }
  }, [status, selectedIds, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            Set status for {selectedIds.size.toLocaleString()} selected contact
            {selectedIds.size !== 1 ? "s" : ""}. Choose a status below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">New status</label>
          <div className="flex flex-wrap gap-2">
            {contactStatuses.map((s) => (
              <button
                key={s.slug}
                type="button"
                disabled={loading}
                onClick={() => setStatus(s.slug)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 ${
                  status === s.slug ? "ring-2 ring-offset-2 ring-ring" : ""
                } ${!s.color ? "bg-muted text-foreground" : ""}`}
                style={
                  s.color
                    ? { backgroundColor: s.color, color: "white" }
                    : undefined
                }
              >
                {s.label}
              </button>
            ))}
          </div>
          {contactStatuses.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No status options. Add them in Settings → CRM.
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
            disabled={!status || loading}
            onClick={handleSubmit}
          >
            {loading ? "Updating…" : "Change status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
