"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Tags, Settings, Mail, Users } from "lucide-react";
import { ContactDetailClient } from "./ContactDetailClient";
import { ContactTaxonomyBlock } from "./ContactTaxonomyBlock";
import type { CrmNote, CrmCustomField, ContactCustomFieldValue, ContactMag, ContactMarketingList, Form } from "@/lib/supabase/crm";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import type { ContactDetailSection } from "./ContactDetailClient";

type TabValue = "notes" | "taxonomy" | "customFields" | "marketingLists" | "memberships";

interface ContactDetailTabsProps {
  contactId: string;
  initialNotes: CrmNote[];
  contactCreatedAt?: string | null;
  /** Form submissions for this contact (Activity Stream "Submitted [Form name]" rows). */
  initialFormSubmissions?: { form_id: string; submitted_at: string }[];
  /** Map form_id -> form name for labelling submissions. */
  formNameById?: Record<string, string>;
  initialCustomFieldDefinitions: CrmCustomField[];
  initialContactCustomFieldValues: ContactCustomFieldValue[];
  initialForms: Form[];
  contactFormId: string | null;
  initialMags: ContactMag[];
  initialMarketingLists: ContactMarketingList[];
  allMarketingLists?: { id: string; name: string; slug: string }[];
  initialNoteTypes?: string[];
  contactStatus: string;
  contactStatuses: CrmContactStatusOption[];
}

export function ContactDetailTabs({
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
  initialNoteTypes,
  contactStatus,
  contactStatuses,
}: ContactDetailTabsProps) {
  const [tab, setTab] = useState<TabValue>("notes");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
      <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
        <TabsTrigger
          value="notes"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Activity Stream
        </TabsTrigger>
        <TabsTrigger
          value="taxonomy"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Tags className="h-3.5 w-3.5 mr-1.5" />
          Taxonomy
        </TabsTrigger>
        <TabsTrigger
          value="customFields"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Custom Fields
        </TabsTrigger>
        <TabsTrigger
          value="marketingLists"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Mail className="h-3.5 w-3.5 mr-1.5" />
          Marketing Lists
        </TabsTrigger>
        <TabsTrigger
          value="memberships"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          Memberships
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        {tab === "taxonomy" ? (
          <Card className="rounded-lg border bg-card min-h-[450px]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold mb-1">Taxonomy</h2>
              <p className="text-xs text-muted-foreground mb-4">Categories and tags for this contact.</p>
              <ContactTaxonomyBlock
                contactId={contactId}
                initialStatus={contactStatus}
                contactStatuses={contactStatuses}
                hideStatus
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border bg-card min-h-[450px]">
            <CardContent className="p-6">
              {tab === "notes" && (
                <>
                  <h2 className="text-sm font-semibold mb-1">Activity Stream</h2>
                  <p className="text-xs text-muted-foreground mb-4">Timestamped activities for this contact, including custom notes.</p>
                </>
              )}
              {tab === "customFields" && (
                <>
                  <h2 className="text-sm font-semibold mb-1">Custom Fields</h2>
                  <p className="text-xs text-muted-foreground mb-4">Form and contact-specific custom field values.</p>
                </>
              )}
              {tab === "marketingLists" && (
                <>
                  <h2 className="text-sm font-semibold mb-1">Marketing Lists</h2>
                  <p className="text-xs text-muted-foreground mb-4">Lists this contact is subscribed to.</p>
                </>
              )}
              {tab === "memberships" && (
                <>
                  <h2 className="text-sm font-semibold mb-1">Memberships</h2>
                  <p className="text-xs text-muted-foreground mb-4">Membership access groups (MAGs) for this contact.</p>
                </>
              )}
              <ContactDetailClient
                contactId={contactId}
                initialNotes={initialNotes}
                contactCreatedAt={contactCreatedAt}
                initialFormSubmissions={initialFormSubmissions}
                formNameById={formNameById}
                initialCustomFieldDefinitions={initialCustomFieldDefinitions}
                initialContactCustomFieldValues={initialContactCustomFieldValues}
                initialForms={initialForms}
                contactFormId={contactFormId}
                initialMags={initialMags}
                initialMarketingLists={initialMarketingLists}
                initialNoteTypes={initialNoteTypes}
                activeSection={tab === "memberships" ? "mags" : (tab as ContactDetailSection)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Tabs>
  );
}
