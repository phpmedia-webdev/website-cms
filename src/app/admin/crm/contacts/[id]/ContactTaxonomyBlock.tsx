"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";

interface ContactTaxonomyBlockProps {
  contactId: string;
  initialStatus: string;
  contactStatuses: CrmContactStatusOption[];
}

/**
 * Taxonomy card for contact detail: status selector at top, then categories & tags.
 * Existing Save button persists both status and taxonomy.
 */
export function ContactTaxonomyBlock({
  contactId,
  initialStatus,
  contactStatuses,
}: ContactTaxonomyBlockProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  const saveStatusBeforeTaxonomy = async () => {
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: selectedStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? "Failed to update status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Status</Label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {contactStatuses.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <TaxonomyAssignmentForContent
        contentId={contactId}
        contentTypeSlug="crm_contact"
        section="crm"
        sectionLabel="CRM"
        compact
        onBeforeSave={saveStatusBeforeTaxonomy}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
