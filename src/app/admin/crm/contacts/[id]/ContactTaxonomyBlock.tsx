"use client";

import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";

interface ContactTaxonomyBlockProps {
  contactId: string;
}

/**
 * Taxonomy picker for CRM contacts. Section "crm", content_type "crm_contact".
 */
export function ContactTaxonomyBlock({ contactId }: ContactTaxonomyBlockProps) {
  return (
    <TaxonomyAssignmentForContent
      contentId={contactId}
      contentTypeSlug="crm_contact"
      section="crm"
      sectionLabel="CRM"
    />
  );
}
