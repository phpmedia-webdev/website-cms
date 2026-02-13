"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CrmNote, CrmCustomField, ContactCustomFieldValue, ContactMag, ContactMarketingList, Form } from "@/lib/supabase/crm";
import { ContactNotesSection } from "@/components/crm/ContactNotesSection";
import { ContactCustomFieldsSection } from "@/components/crm/ContactCustomFieldsSection";
import { ContactMarketingListsSection } from "@/components/crm/ContactMarketingListsSection";
import { ContactMagsSection } from "@/components/crm/ContactMagsSection";

export type ContactDetailSection = "notes" | "customFields" | "marketingLists" | "mags";

interface ContactDetailClientProps {
  contactId: string;
  initialNotes: CrmNote[];
  /** Contact created_at for Activity Stream "Contact added" system line. */
  contactCreatedAt?: string | null;
  /** Form submissions for this contact (Activity Stream "Submitted [Form name]" rows). */
  initialFormSubmissions?: { form_id: string; submitted_at: string }[];
  /** Map form_id -> form name for labelling submissions. */
  formNameById?: Record<string, string>;
  /** All CRM custom field definitions (from Settings/Forms); shown for every contact with value or empty. */
  initialCustomFieldDefinitions: CrmCustomField[];
  /** This contact's custom field values (from crm_contact_custom_fields). */
  initialContactCustomFieldValues: ContactCustomFieldValue[];
  /** All forms (for Custom Fields section filter). */
  initialForms: Form[];
  /** This contact's form_id (for "Contact's form" filter option). */
  contactFormId: string | null;
  initialMags: ContactMag[];
  initialMarketingLists: ContactMarketingList[];
  initialNoteTypes?: string[];
  /** When set, render only this section (for tabbed layout). When undefined, render all sections in accordion. */
  activeSection?: ContactDetailSection | null;
}

export function ContactDetailClient({
  contactId,
  initialNotes,
  contactCreatedAt,
  initialFormSubmissions,
  formNameById,
  initialCustomFieldDefinitions,
  initialContactCustomFieldValues,
  initialForms,
  contactFormId,
  initialMags,
  initialMarketingLists,
  initialNoteTypes = ["call", "task", "email", "meeting"],
  activeSection = null,
}: ContactDetailClientProps) {
  // Accordion state: persist per contact so sections stay open when returning from Edit (same contact)
  const OPEN_SECTIONS_KEY = (id: string) => `crm-contact-detail-open-sections-${id}`;
  const getStoredOpenSections = (id: string): Record<string, boolean> | null => {
    if (typeof window === "undefined") return null;
    try {
      const s = sessionStorage.getItem(OPEN_SECTIONS_KEY(id));
      if (!s) return null;
      const parsed = JSON.parse(s) as Record<string, boolean>;
      if (
        parsed &&
        typeof parsed.customFields === "boolean" &&
        typeof parsed.marketingLists === "boolean" &&
        typeof parsed.mags === "boolean"
      )
        return parsed;
    } catch {
      // ignore invalid JSON
    }
    return null;
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const stored = getStoredOpenSections(contactId);
    return stored ?? { customFields: false, marketingLists: false, mags: false };
  });
  useEffect(() => {
    sessionStorage.setItem(OPEN_SECTIONS_KEY(contactId), JSON.stringify(openSections));
  }, [contactId, openSections]);

  const useAccordion = activeSection == null;
  const showNotes = !activeSection || activeSection === "notes";
  const showCustomFields = !activeSection || activeSection === "customFields";
  const showMarketingLists = !activeSection || activeSection === "marketingLists";
  const showMags = !activeSection || activeSection === "mags";

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {showNotes && (
        <ContactNotesSection
          contactId={contactId}
          initialNotes={initialNotes}
          contactCreatedAt={contactCreatedAt}
          initialFormSubmissions={initialFormSubmissions}
          formNameById={formNameById}
          initialMags={initialMags?.map((m) => ({ mag_name: m.mag_name, assigned_at: m.assigned_at }))}
          initialMarketingLists={initialMarketingLists?.map((m) => ({ list_name: m.list_name, added_at: m.added_at }))}
          noteTypes={initialNoteTypes}
        />
      )}

      {/* Custom Fields — accordion when full layout, always visible when tabbed */}
      {showCustomFields && (
      <Card className="overflow-hidden">
        {useAccordion ? (
          <>
            <button
              type="button"
              className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
              onClick={() => toggleSection("customFields")}
            >
              <span>Custom Fields</span>
              {openSections.customFields ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {openSections.customFields && (
            <CardContent className="pt-0 px-4 pb-4 space-y-3">
              <ContactCustomFieldsSection
                contactId={contactId}
                initialCustomFieldDefinitions={initialCustomFieldDefinitions}
                initialContactCustomFieldValues={initialContactCustomFieldValues}
                initialForms={initialForms}
                contactFormId={contactFormId}
              />
            </CardContent>
            )}
            </>
          ) : (
            <CardContent className="pt-4 px-4 pb-4 space-y-3">
              <ContactCustomFieldsSection
                contactId={contactId}
                initialCustomFieldDefinitions={initialCustomFieldDefinitions}
                initialContactCustomFieldValues={initialContactCustomFieldValues}
                initialForms={initialForms}
                contactFormId={contactFormId}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Marketing Lists — accordion when full layout, always visible when tabbed */}
      {showMarketingLists && (
      <Card className="overflow-hidden">
        {useAccordion ? (
          <>
            <button
              type="button"
              className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
              onClick={() => toggleSection("marketingLists")}
            >
              <span>Marketing Lists</span>
              {openSections.marketingLists ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {openSections.marketingLists && (
            <CardContent className="pt-0 px-4 pb-4 space-y-2">
              <ContactMarketingListsSection contactId={contactId} initialMarketingLists={initialMarketingLists} />
            </CardContent>
            )}
            </>
          ) : (
            <CardContent className="pt-4 px-4 pb-4 space-y-2">
              <ContactMarketingListsSection contactId={contactId} initialMarketingLists={initialMarketingLists} />
            </CardContent>
          )}
        </Card>
      )}

      {/* Memberships (MAGs) — accordion when full layout, always visible when tabbed */}
      {showMags && (
      <Card className="overflow-hidden">
        {useAccordion ? (
          <>
            <button
              type="button"
              className="w-full flex items-center justify-between py-2 px-4 text-left text-sm font-semibold hover:bg-muted/30"
              onClick={() => toggleSection("mags")}
            >
              <span>Memberships</span>
              {openSections.mags ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {openSections.mags && (
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            <ContactMagsSection contactId={contactId} initialMags={initialMags} />
          </CardContent>
        )}
            </>
          ) : (
            <CardContent className="pt-4 px-4 pb-4 space-y-2">
              <ContactMagsSection contactId={contactId} initialMags={initialMags} />
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}
