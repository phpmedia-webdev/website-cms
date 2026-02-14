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
import { MERGEABLE_CORE_KEYS } from "@/lib/supabase/crm";
import type { CrmContact } from "@/lib/supabase/crm";
import type { MergeFieldChoices } from "@/lib/supabase/crm";
import { MergeSideBySide, type MergeCustomFieldRow } from "@/components/crm/MergeSideBySide";

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

function countNonEmpty(contact: CrmContact): number {
  let n = 0;
  for (const key of MERGEABLE_CORE_KEYS) {
    const v = contact[key as keyof CrmContact];
    if (v != null && String(v).trim() !== "") n++;
  }
  return n;
}

/** Bulk merge: choose which contact to keep, then side-by-side field selector. Suggests primary by completeness. */
export function MergeBulkDialog({
  open,
  onOpenChange,
  contactA,
  contactB,
  onSuccess,
}: MergeBulkDialogProps) {
  const [primaryId, setPrimaryId] = useState<string>(contactA.id);
  const [contactAData, setContactAData] = useState<CrmContact | null>(null);
  const [contactBData, setContactBData] = useState<CrmContact | null>(null);
  const [customFieldsA, setCustomFieldsA] = useState<MergeCustomFieldRow[]>([]);
  const [customFieldsB, setCustomFieldsB] = useState<MergeCustomFieldRow[]>([]);
  const [fieldChoices, setFieldChoices] = useState<MergeFieldChoices>({});
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUnderstood(false);
    setError(null);
    setLoadingPreview(true);
    Promise.all([
      fetch(`/api/crm/contacts/${contactA.id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/crm/contacts/${contactB.id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/crm/contacts/${contactA.id}/custom-fields`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/crm/contacts/${contactB.id}/custom-fields`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([a, b, cfA, cfB]) => {
        setContactAData(a);
        setContactBData(b);
        const toRow = (x: { custom_field_id: string; custom_field_label: string; value: string | null }) =>
          ({ custom_field_id: x.custom_field_id, custom_field_label: x.custom_field_label, value: x.value });
        setCustomFieldsA(Array.isArray(cfA) ? cfA.map(toRow) : []);
        setCustomFieldsB(Array.isArray(cfB) ? cfB.map(toRow) : []);
        if (a && b) {
          const countA = countNonEmpty(a);
          const countB = countNonEmpty(b);
          const suggested = countB > countA ? contactB.id : countA > countB ? contactA.id : (new Date((b as CrmContact).updated_at).getTime() > new Date((a as CrmContact).updated_at).getTime() ? contactB.id : contactA.id);
          setSuggestedId(suggested);
          setPrimaryId(suggested);
        } else {
          setSuggestedId(null);
        }
      })
      .catch(() => {
        setContactAData(null);
        setContactBData(null);
        setCustomFieldsA([]);
        setCustomFieldsB([]);
        setSuggestedId(null);
      })
      .finally(() => setLoadingPreview(false));
  }, [open, contactA.id, contactB.id]);

  const primaryContact = primaryId === contactA.id ? contactAData : contactBData;
  const secondaryContact = primaryId === contactA.id ? contactBData : contactAData;
  const primaryCustomFields = primaryId === contactA.id ? customFieldsA : customFieldsB;
  const secondaryCustomFields = primaryId === contactA.id ? customFieldsB : customFieldsA;
  const primaryLabel = primaryId === contactA.id ? contactA.displayName : contactB.displayName;
  const secondaryLabel = primaryId === contactA.id ? contactB.displayName : contactA.displayName;

  const onFieldChoicesChange = useCallback((choices: MergeFieldChoices) => {
    setFieldChoices(choices);
  }, []);

  const handleMerge = useCallback(async () => {
    if (!primaryId || !understood) return;
    const secondaryId = primaryId === contactA.id ? contactB.id : contactA.id;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryId,
          secondaryId,
          fieldChoices: Object.keys(fieldChoices).length ? fieldChoices : undefined,
        }),
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
  }, [primaryId, understood, fieldChoices, contactA.id, contactB.id, onSuccess, onOpenChange]);

  const canMerge = primaryId && understood && !loading;
  const showSideBySide = primaryContact && secondaryContact && !loadingPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
                Choose which contact to keep. The other will be merged into it. Use the table below to choose which value to keep for each field; notes and other related data are combined from both.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-sm font-medium">Keep this contact (the other will be merged into it)</Label>
            {loadingPreview && (
              <p className="text-sm text-muted-foreground mt-1">Loading…</p>
            )}
            {!loadingPreview && (
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
                  {suggestedId === contactA.id && (
                    <span className="text-xs text-muted-foreground font-normal">(suggested)</span>
                  )}
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
                  {suggestedId === contactB.id && (
                    <span className="text-xs text-muted-foreground font-normal">(suggested)</span>
                  )}
                </label>
              </div>
            )}
          </div>
          {showSideBySide && (
            <MergeSideBySide
              primaryContact={primaryContact}
              secondaryContact={secondaryContact}
              primaryCustomFields={primaryCustomFields}
              secondaryCustomFields={secondaryCustomFields}
              primaryLabel={primaryLabel}
              secondaryLabel={secondaryLabel}
              onFieldChoicesChange={onFieldChoicesChange}
            />
          )}
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
