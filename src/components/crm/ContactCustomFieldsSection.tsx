"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import type { CrmCustomField, ContactCustomFieldValue, Form } from "@/lib/supabase/crm";

const FORM_FILTER_KEY = "crm-contact-custom-fields-form-filter";

function getStoredFormFilter(): string {
  if (typeof window === "undefined") return "all";
  try {
    const s = sessionStorage.getItem(FORM_FILTER_KEY);
    if (s && (s === "all" || s === "contact" || s.length > 0)) return s;
  } catch {
    // ignore
  }
  return "all";
}

interface ContactCustomFieldsSectionProps {
  contactId: string;
  initialCustomFieldDefinitions: CrmCustomField[];
  initialContactCustomFieldValues: ContactCustomFieldValue[];
  initialForms: Form[];
  contactFormId: string | null;
}

/**
 * Custom Fields section content for contact detail.
 * Renders form filter dropdown and field list with inline edit. Parent wraps in Card/accordion.
 */
export function ContactCustomFieldsSection({
  contactId,
  initialCustomFieldDefinitions,
  initialContactCustomFieldValues,
  initialForms,
  contactFormId,
}: ContactCustomFieldsSectionProps) {
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const v of initialContactCustomFieldValues) {
      map[v.custom_field_id] = v.value;
    }
    return map;
  });
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [customFieldEditValue, setCustomFieldEditValue] = useState("");
  const [customFieldSaving, setCustomFieldSaving] = useState(false);
  const [formFilter, setFormFilter] = useState<string>(() => getStoredFormFilter());
  const [formFieldCustomIds, setFormFieldCustomIds] = useState<Set<string> | null>(null);

  const effectiveFormId =
    formFilter === "contact" && contactFormId ? contactFormId : formFilter === "all" ? null : formFilter;

  useEffect(() => {
    if (!effectiveFormId) {
      setFormFieldCustomIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/crm/forms/${effectiveFormId}/fields`);
        if (!res.ok || cancelled) return;
        const assignments = (await res.json()) as Array<{ field_source?: string; custom_field_id?: string | null }>;
        const ids = new Set(
          (assignments ?? [])
            .filter((a) => a.field_source === "custom" && a.custom_field_id)
            .map((a) => a.custom_field_id as string)
        );
        if (!cancelled) setFormFieldCustomIds(ids);
      } catch {
        if (!cancelled) setFormFieldCustomIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveFormId]);

  useEffect(() => {
    sessionStorage.setItem(FORM_FILTER_KEY, formFilter);
  }, [formFilter]);

  const customFieldsWithValues = useMemo(() => {
    return initialCustomFieldDefinitions.map((def) => ({
      definition: def,
      value: customFieldValues[def.id] ?? null,
    }));
  }, [initialCustomFieldDefinitions, customFieldValues]);

  const displayedCustomFieldsWithValues = useMemo(() => {
    if (formFieldCustomIds === null) return customFieldsWithValues;
    return customFieldsWithValues.filter(({ definition }) => formFieldCustomIds.has(definition.id));
  }, [customFieldsWithValues, formFieldCustomIds]);

  const getCustomFieldOptions = (def: CrmCustomField): string[] => {
    const opts = def.validation_rules?.options;
    if (Array.isArray(opts)) return opts.filter((o): o is string => typeof o === "string");
    return [];
  };

  const startEditCustomField = (definition: CrmCustomField, currentValue: string | null) => {
    setEditingCustomFieldId(definition.id);
    setCustomFieldEditValue(currentValue ?? "");
  };

  const cancelEditCustomField = () => {
    setEditingCustomFieldId(null);
    setCustomFieldEditValue("");
  };

  const saveCustomFieldValue = async (definition: CrmCustomField) => {
    setCustomFieldSaving(true);
    try {
      const valueToSave = customFieldEditValue.trim() || null;
      const res = await fetch(`/api/crm/contacts/${contactId}/custom-fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_field_id: definition.id,
          value: valueToSave,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setCustomFieldValues((prev) => ({ ...prev, [definition.id]: valueToSave }));
      setEditingCustomFieldId(null);
      setCustomFieldEditValue("");
    } catch (err) {
      console.error("Error saving custom field:", err);
    } finally {
      setCustomFieldSaving(false);
    }
  };

  const formFilterSelectValue = formFilter === "contact" && !contactFormId ? "all" : formFilter;

  return (
    <div className="space-y-3">
      {customFieldsWithValues.length > 0 && (
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-fields-form-filter" className="text-xs text-muted-foreground shrink-0">
            Show fields:
          </Label>
          <Select value={formFilterSelectValue} onValueChange={setFormFilter}>
            <SelectTrigger id="custom-fields-form-filter" className="h-8 text-sm max-w-[200px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {contactFormId && initialForms.some((f) => f.id === contactFormId) && (
                <SelectItem value="contact">Contact&apos;s form</SelectItem>
              )}
              {initialForms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {displayedCustomFieldsWithValues.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {customFieldsWithValues.length === 0
            ? "No custom fields defined. Add custom fields in Settings or Forms."
            : effectiveFormId
              ? "No custom fields assigned to this form."
              : "No custom fields."}
        </p>
      ) : (
        <div className="space-y-2 text-sm">
          {displayedCustomFieldsWithValues.map(({ definition, value }) => {
            const isEditing = editingCustomFieldId === definition.id;
            const options = getCustomFieldOptions(definition);
            const isComplexEdit = definition.type === "textarea" || definition.type === "multiselect";
            return (
              <div key={definition.id} className="flex items-center gap-2 w-full min-h-8">
                <span className="font-medium text-muted-foreground text-xs shrink-0 min-w-[8rem]">
                  {definition.label}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {isEditing ? (
                    isComplexEdit ? (
                      <div className="flex flex-col gap-1.5 w-full min-w-0">
                        {definition.type === "multiselect" && (
                          <div className="flex flex-wrap gap-2 py-1">
                            {options.map((opt) => {
                              const selected = customFieldEditValue
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const checked = selected.includes(opt);
                              return (
                                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(checked) => {
                                      const next = checked
                                        ? [...selected.filter((s) => s !== opt), opt]
                                        : selected.filter((s) => s !== opt);
                                      setCustomFieldEditValue(next.join(", "));
                                    }}
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {definition.type === "textarea" && (
                          <textarea
                            className="flex min-h-[60px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={customFieldEditValue}
                            onChange={(e) => setCustomFieldEditValue(e.target.value)}
                            rows={3}
                          />
                        )}
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditCustomField} disabled={customFieldSaving}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => saveCustomFieldValue(definition)} disabled={customFieldSaving}>
                            {customFieldSaving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {definition.type === "select" && (
                          <Select value={customFieldEditValue || ""} onValueChange={setCustomFieldEditValue}>
                            <SelectTrigger className="h-8 text-sm flex-1 min-w-0">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              {options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {(definition.type === "text" ||
                          definition.type === "email" ||
                          definition.type === "tel" ||
                          definition.type === "url" ||
                          definition.type === "number" ||
                          !["select", "multiselect", "textarea"].includes(definition.type)) && (
                          <Input
                            className="h-8 text-sm flex-1 min-w-0"
                            type={definition.type === "number" ? "number" : "text"}
                            value={customFieldEditValue}
                            onChange={(e) => setCustomFieldEditValue(e.target.value)}
                          />
                        )}
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditCustomField} disabled={customFieldSaving}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => saveCustomFieldValue(definition)} disabled={customFieldSaving}>
                            {customFieldSaving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate text-sm" title={value ?? undefined}>
                        {value ?? "—"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => startEditCustomField(definition, value)}
                        aria-label={`Edit ${definition.label}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
