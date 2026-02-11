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
import { Checkbox } from "@/components/ui/checkbox";
import { EXPORT_CONTACT_FIELDS, EXPORT_MAX_RECORDS } from "@/lib/crm-export";

const CUSTOM_PREFIX = "custom:";

interface CrmCustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface ExportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
}

export function ExportContactsDialog({
  open,
  onOpenChange,
  selectedIds,
}: ExportContactsDialogProps) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() =>
    new Set(EXPORT_CONTACT_FIELDS.map((f) => f.key))
  );
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CrmCustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/crm/custom-fields")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CrmCustomFieldDefinition[]) => setCustomFieldDefinitions(Array.isArray(data) ? data : []))
      .catch(() => setCustomFieldDefinitions([]));
  }, [open]);

  const overLimit = selectedIds.size > EXPORT_MAX_RECORDS;
  const canExport = selectedIds.size > 0 && selectedFields.size > 0 && !overLimit;

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllFields = useCallback(() => {
    setSelectedFields(
      new Set([
        ...EXPORT_CONTACT_FIELDS.map((f) => f.key),
        ...customFieldDefinitions.map((d) => `${CUSTOM_PREFIX}${d.id}`),
      ])
    );
  }, [customFieldDefinitions]);

  const handleExport = useCallback(async () => {
    if (!canExport) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          format,
          fields: Array.from(selectedFields),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `contacts-export.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }, [canExport, selectedIds, format, selectedFields, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export contacts</DialogTitle>
          <DialogDescription>
            Export {selectedIds.size.toLocaleString()} selected contact
            {selectedIds.size !== 1 ? "s" : ""} as CSV or PDF. Choose which
            fields to include.
          </DialogDescription>
        </DialogHeader>
        {overLimit && (
          <p className="text-sm text-destructive font-medium">
            Export is limited to {EXPORT_MAX_RECORDS.toLocaleString()} contacts.
            You have {selectedIds.size.toLocaleString()}. Narrow filters or
            select fewer to export.
          </p>
        )}
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium">Format</span>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="rounded border-input"
                />
                <span className="text-sm">CSV</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={format === "pdf"}
                  onChange={() => setFormat("pdf")}
                  className="rounded border-input"
                />
                <span className="text-sm">PDF</span>
              </label>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fields to include</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAllFields}
              >
                Select all
              </Button>
            </div>
            <div className="mt-2 border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {EXPORT_CONTACT_FIELDS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedFields.has(key)}
                    onCheckedChange={() => toggleField(key)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
              {customFieldDefinitions.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground pt-1 border-t mt-1">
                    Custom fields
                  </div>
                  {customFieldDefinitions.map((d) => {
                    const key = `${CUSTOM_PREFIX}${d.id}`;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedFields.has(key)}
                          onCheckedChange={() => toggleField(key)}
                        />
                        <span className="text-sm">{d.label}</span>
                      </label>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canExport || loading}
            onClick={handleExport}
          >
            {loading ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
