"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactStatusSelectItems } from "@/components/crm/ContactStatusSelectItems";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import {
  findCrmContactStatusOption,
  type CrmContactStatusOption,
} from "@/lib/supabase/settings";

interface ContactTaxonomyBlockProps {
  contactId: string;
  initialStatus: string;
  contactStatuses: CrmContactStatusOption[];
  /** When true, hide status dropdown (e.g. when status is in Contact card). */
  hideStatus?: boolean;
}

/**
 * Taxonomy card for contact detail: optional status selector, then categories & tags.
 * When hideStatus is true, only taxonomy is shown (status lives in Contact card).
 */
export function ContactTaxonomyBlock({
  contactId,
  initialStatus,
  contactStatuses,
  hideStatus = false,
}: ContactTaxonomyBlockProps) {
  const router = useRouter();
  const canonicalInitial =
    findCrmContactStatusOption(contactStatuses, initialStatus)?.slug ?? initialStatus;
  const [selectedStatus, setSelectedStatus] = useState(canonicalInitial);
  useEffect(() => {
    setSelectedStatus(
      findCrmContactStatusOption(contactStatuses, initialStatus)?.slug ?? initialStatus
    );
  }, [initialStatus, contactStatuses]);

  const saveStatusBeforeTaxonomy = async () => {
    if (hideStatus) return;
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
      {!hideStatus && (
        <div className="space-y-1.5">
          <Label htmlFor="contact-taxonomy-status" className="text-sm font-medium">
            Status
          </Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger
              id="contact-taxonomy-status"
              className="h-8 w-full border-input bg-background"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <ContactStatusSelectItems contactStatuses={contactStatuses} />
            </SelectContent>
          </Select>
        </div>
      )}
      <TaxonomyAssignmentForContent
        contentId={contactId}
        contentTypeSlug="crm_contact"
        section="contact"
        sectionLabel="Contact"
        compact
        onBeforeSave={saveStatusBeforeTaxonomy}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
