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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import type { CrmCustomField } from "@/lib/supabase/crm";

type View = "type" | "standard" | "custom";

interface SetCrmFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  contactStatuses: CrmContactStatusOption[];
  onSuccess?: () => void;
}

function getCustomFieldOptions(def: CrmCustomField): string[] {
  const opts = def.validation_rules?.options;
  if (Array.isArray(opts)) return opts.filter((o): o is string => typeof o === "string");
  return [];
}

export function SetCrmFieldsDialog({
  open,
  onOpenChange,
  selectedIds,
  contactStatuses,
  onSuccess,
}: SetCrmFieldsDialogProps) {
  const [view, setView] = useState<View>("type");
  const [status, setStatus] = useState("");
  const [customFields, setCustomFields] = useState<CrmCustomField[]>([]);
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [selectedCustomFieldId, setSelectedCustomFieldId] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [clearCustomValue, setClearCustomValue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = selectedIds.size;

  // Fetch custom field definitions when user enters custom path
  useEffect(() => {
    if (!open || view !== "custom") return;
    setCustomFieldsLoading(true);
    fetch("/api/crm/custom-fields")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCustomFields(Array.isArray(data) ? data : []))
      .catch(() => setCustomFields([]))
      .finally(() => setCustomFieldsLoading(false));
  }, [open, view]);

  const resetToType = useCallback(() => {
    setView("type");
    setStatus("");
    setSelectedCustomFieldId("");
    setCustomFieldValue("");
    setClearCustomValue(false);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetToType();
      onOpenChange(next);
    },
    [onOpenChange, resetToType]
  );

  const handleStandardSubmit = useCallback(async () => {
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
      handleOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change status");
    } finally {
      setLoading(false);
    }
  }, [status, selectedIds, onSuccess, handleOpenChange]);

  const handleCustomSubmit = useCallback(async () => {
    if (!selectedCustomFieldId) return;
    setError(null);
    setLoading(true);
    try {
      const definition = customFields.find((f) => f.id === selectedCustomFieldId);
      const value = clearCustomValue
        ? null
        : definition?.type === "checkbox"
          ? customFieldValue === "true" || customFieldValue === "1"
            ? "true"
            : "false"
          : (customFieldValue.trim() || null);
      const res = await fetch("/api/crm/contacts/custom-fields/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          custom_field_id: selectedCustomFieldId,
          value,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      onSuccess?.();
      handleOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set custom field");
    } finally {
      setLoading(false);
    }
  }, [
    selectedCustomFieldId,
    customFieldValue,
    clearCustomValue,
    customFields,
    selectedIds,
    onSuccess,
    handleOpenChange,
  ]);

  const selectedDefinition = customFields.find((f) => f.id === selectedCustomFieldId);
  const customOptions = selectedDefinition ? getCustomFieldOptions(selectedDefinition) : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set CRM Fields</DialogTitle>
          <DialogDescription>
            Set a field for {n.toLocaleString()} selected contact{n !== 1 ? "s" : ""}. Choose standard or custom.
          </DialogDescription>
        </DialogHeader>

        {view === "type" && (
          <div className="space-y-3">
            <Label>What do you want to set?</Label>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => setView("standard")}
              >
                Standard field (e.g. Status)
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => setView("custom")}
              >
                Custom field
              </Button>
            </div>
          </div>
        )}

        {view === "standard" && (
          <div className="space-y-3">
            <Label>Status</Label>
            <p className="text-sm text-muted-foreground">
              Set status for all selected contacts.
            </p>
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
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={resetToType}>
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!status || loading}
                onClick={handleStandardSubmit}
              >
                {loading ? "Updating…" : "Change status"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {view === "custom" && (
          <div className="space-y-3">
            {customFieldsLoading ? (
              <p className="text-sm text-muted-foreground">Loading custom fields…</p>
            ) : customFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom fields. Add them in CRM → Forms (Custom Fields).
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="custom-field-select">Custom field</Label>
                  <Select
                    value={selectedCustomFieldId}
                    onValueChange={(id) => {
                      setSelectedCustomFieldId(id);
                      setCustomFieldValue("");
                      setClearCustomValue(false);
                    }}
                  >
                    <SelectTrigger id="custom-field-select" className="w-full">
                      <SelectValue placeholder="Select a field…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customFields.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label || f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDefinition && (
                  <>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="clear-custom"
                        checked={clearCustomValue}
                        onCheckedChange={(c) => setClearCustomValue(!!c)}
                      />
                      <Label htmlFor="clear-custom" className="text-sm font-normal cursor-pointer">
                        Clear value (remove for all selected)
                      </Label>
                    </div>

                    {!clearCustomValue && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-field-value">Value</Label>
                        {selectedDefinition.type === "textarea" && (
                          <textarea
                            id="custom-field-value"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                            value={customFieldValue}
                            onChange={(e) => setCustomFieldValue(e.target.value)}
                            placeholder="Enter value…"
                          />
                        )}
                        {selectedDefinition.type === "select" && (
                          <Select
                            value={customFieldValue || ""}
                            onValueChange={setCustomFieldValue}
                          >
                            <SelectTrigger id="custom-field-value" className="w-full">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              {customOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {selectedDefinition.type === "multiselect" && (
                          <div className="flex flex-wrap gap-2 py-1">
                            {customOptions.map((opt) => {
                              const selected = customFieldValue
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const checked = selected.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(checked) => {
                                      const next = checked
                                        ? [...selected.filter((s) => s !== opt), opt]
                                        : selected.filter((s) => s !== opt);
                                      setCustomFieldValue(next.join(", "));
                                    }}
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {selectedDefinition.type === "checkbox" && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="custom-field-value"
                              checked={customFieldValue === "true" || customFieldValue === "1"}
                              onCheckedChange={(c) =>
                                setCustomFieldValue(c ? "true" : "false")
                              }
                            />
                            <Label htmlFor="custom-field-value" className="text-sm font-normal">
                              Yes
                            </Label>
                          </div>
                        )}
                        {(selectedDefinition.type === "text" ||
                          selectedDefinition.type === "email" ||
                          selectedDefinition.type === "tel" ||
                          selectedDefinition.type === "url" ||
                          selectedDefinition.type === "number" ||
                          !["select", "multiselect", "textarea", "checkbox"].includes(
                            selectedDefinition.type
                          )) && (
                          <Input
                            id="custom-field-value"
                            type={selectedDefinition.type === "number" ? "number" : "text"}
                            value={customFieldValue}
                            onChange={(e) => setCustomFieldValue(e.target.value)}
                            placeholder="Enter value…"
                            className="w-full"
                          />
                        )}
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="ghost" onClick={resetToType}>
                    Back
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      !selectedCustomFieldId ||
                      loading ||
                      (!clearCustomValue &&
                        selectedDefinition?.type !== "checkbox" &&
                        !customFieldValue.trim())
                    }
                    onClick={handleCustomSubmit}
                  >
                    {loading ? "Updating…" : clearCustomValue ? "Clear value" : "Set value"}
                  </Button>
                </DialogFooter>
              </>
            )}

            {!customFieldsLoading && customFields.length === 0 && (
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={resetToType}>
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            )}
          </div>
        )}

        {view === "type" && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
