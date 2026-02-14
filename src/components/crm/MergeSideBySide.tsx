"use client";

import { useState, useEffect, useMemo } from "react";
import { MERGEABLE_CORE_KEYS } from "@/lib/supabase/crm";
import type { CrmContact } from "@/lib/supabase/crm";
import type { MergeFieldChoices } from "@/lib/supabase/crm";

/** Human-readable labels for core contact fields in merge UI. */
const CORE_FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  first_name: "First name",
  last_name: "Last name",
  full_name: "Full name",
  company: "Company",
  address: "Address",
  city: "City",
  state: "State",
  postal_code: "Postal code",
  country: "Country",
  status: "Status",
  dnd_status: "Do not contact",
  source: "Source",
  message: "Message",
};

export interface MergeCustomFieldRow {
  custom_field_id: string;
  custom_field_label: string;
  value: string | null;
}

export interface MergeSideBySideProps {
  primaryContact: CrmContact;
  secondaryContact: CrmContact;
  primaryCustomFields: MergeCustomFieldRow[];
  secondaryCustomFields: MergeCustomFieldRow[];
  primaryLabel: string;
  secondaryLabel: string;
  /** Called when user changes a field choice; parent can pass to merge API. */
  onFieldChoicesChange: (choices: MergeFieldChoices) => void;
}

interface MergeRow {
  fieldKey: string;
  label: string;
  primaryValue: string;
  secondaryValue: string;
}

function formatVal(v: unknown): string {
  if (v == null || v === "") return "—";
  const s = String(v).trim();
  return s || "—";
}

/**
 * Side-by-side merge: shows Primary | Secondary with a "Keep" selector per field and a Proposed column.
 * Notes and other combined data are described in copy (not pick-one).
 */
export function MergeSideBySide({
  primaryContact,
  secondaryContact,
  primaryCustomFields,
  secondaryCustomFields,
  primaryLabel,
  secondaryLabel,
  onFieldChoicesChange,
}: MergeSideBySideProps) {
  const rows = useMemo((): MergeRow[] => {
    const out: MergeRow[] = [];
    for (const key of MERGEABLE_CORE_KEYS) {
      const pVal = primaryContact[key as keyof CrmContact];
      const sVal = secondaryContact[key as keyof CrmContact];
      out.push({
        fieldKey: key,
        label: CORE_FIELD_LABELS[key] ?? key,
        primaryValue: formatVal(pVal),
        secondaryValue: formatVal(sVal),
      });
    }
    const cfByKey = new Map(secondaryCustomFields.map((c) => [c.custom_field_id, c]));
    for (const p of primaryCustomFields) {
      const s = cfByKey.get(p.custom_field_id);
      out.push({
        fieldKey: p.custom_field_id,
        label: p.custom_field_label,
        primaryValue: formatVal(p.value),
        secondaryValue: s ? formatVal(s.value) : "—",
      });
    }
    for (const s of secondaryCustomFields) {
      if (primaryCustomFields.some((p) => p.custom_field_id === s.custom_field_id)) continue;
      out.push({
        fieldKey: s.custom_field_id,
        label: s.custom_field_label,
        primaryValue: "—",
        secondaryValue: formatVal(s.value),
      });
    }
    return out;
  }, [
    primaryContact,
    secondaryContact,
    primaryCustomFields,
    secondaryCustomFields,
  ]);

  const defaultChoices = useMemo((): MergeFieldChoices => {
    const choices: MergeFieldChoices = {};
    for (const r of rows) {
      const pEmpty = r.primaryValue === "—";
      const sEmpty = r.secondaryValue === "—";
      if (pEmpty && !sEmpty) choices[r.fieldKey] = "secondary";
      else choices[r.fieldKey] = "primary";
    }
    return choices;
  }, [rows]);

  const [fieldChoices, setFieldChoices] = useState<MergeFieldChoices>(defaultChoices);

  useEffect(() => {
    setFieldChoices(defaultChoices);
  }, [defaultChoices]);

  useEffect(() => {
    onFieldChoicesChange(fieldChoices);
  }, [fieldChoices, onFieldChoicesChange]);

  const setChoice = (fieldKey: string, choice: "primary" | "secondary") => {
    setFieldChoices((prev) => ({ ...prev, [fieldKey]: choice }));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Notes, form submissions, memberships, and other related data will be combined from both contacts (not chosen per field).
      </p>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[min(50vh,24rem)] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
              <tr>
                <th className="text-left font-medium py-2 px-2 w-[8rem]">Field</th>
                <th className="text-left font-medium py-2 px-2">{primaryLabel}</th>
                <th className="text-left font-medium py-2 px-2">{secondaryLabel}</th>
                <th className="text-left font-medium py-2 px-2 w-[6rem]">Keep</th>
                <th className="text-left font-medium py-2 px-2">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const choice = fieldChoices[r.fieldKey] ?? "primary";
                const proposed = choice === "primary" ? r.primaryValue : r.secondaryValue;
                return (
                  <tr key={r.fieldKey} className="border-t border-border">
                    <td className="py-1.5 px-2 font-medium text-muted-foreground">{r.label}</td>
                    <td className="py-1.5 px-2 align-top">{r.primaryValue}</td>
                    <td className="py-1.5 px-2 align-top">{r.secondaryValue}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex gap-2 items-center">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`keep-${r.fieldKey}`}
                            checked={choice === "primary"}
                            onChange={() => setChoice(r.fieldKey, "primary")}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs">Primary</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`keep-${r.fieldKey}`}
                            checked={choice === "secondary"}
                            onChange={() => setChoice(r.fieldKey, "secondary")}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs">Secondary</span>
                        </label>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground">{proposed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
