"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { User, Tags, Settings, Mail, FileText, Users, FolderKanban, Receipt } from "lucide-react";
import { ContactDetailClient } from "./ContactDetailClient";
import { ContactTaxonomyBlock } from "./ContactTaxonomyBlock";
import { ContactTransactionsTab } from "./ContactTransactionsTab";
import type { CrmNote, CrmCustomField, ContactCustomFieldValue, ContactMag, ContactMarketingList, Form } from "@/lib/supabase/crm";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";
import type { ContactDetailSection } from "./ContactDetailClient";

type Section1Tab = "detail" | "taxonomy" | "customFields" | "marketingLists";
type Section2Tab = "activity" | "memberships" | "projects" | "transactions";

interface ContactRecordLayoutProps {
  /** First section: contact info card (shown when Contact Detail is selected). */
  contactDetailContent: React.ReactNode;
  contactId: string;
  contactEmail: string | null;
  displayName: string;
  contactStatus: string;
  contactStatuses: CrmContactStatusOption[];
  initialNotes: CrmNote[];
  /** Resolved display labels for note author_id (handle/display_name). */
  authorLabels?: Record<string, string>;
  contactCreatedAt?: string | null;
  initialFormSubmissions?: { form_id: string; submitted_at: string }[];
  formNameById?: Record<string, string>;
  initialCustomFieldDefinitions: CrmCustomField[];
  initialContactCustomFieldValues: ContactCustomFieldValue[];
  initialForms: Form[];
  contactFormId: string | null;
  initialMags: ContactMag[];
  initialMarketingLists: ContactMarketingList[];
  allMarketingLists?: { id: string; name: string; slug: string }[];
  initialNoteTypes?: string[];
}

export function ContactRecordLayout({
  contactDetailContent,
  contactId,
  contactEmail,
  displayName,
  contactStatus,
  contactStatuses,
  initialNotes,
  authorLabels,
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
}: ContactRecordLayoutProps) {
  const [section1, setSection1] = useState<Section1Tab>("detail");
  const [section2, setSection2] = useState<Section2Tab>("activity");

  const detailClientProps = {
    contactId,
  initialNotes,
  authorLabels,
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
  activeSection: "notes" as ContactDetailSection,
};

  return (
    <div className="space-y-6">
      {/* Section 1: Contact record — Contact Detail (default) | Taxonomy | Custom Fields | Marketing Lists */}
      <Tabs value={section1} onValueChange={(v) => setSection1(v as Section1Tab)} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto border-b">
          <TabsTrigger value="detail" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Contact Detail
          </TabsTrigger>
          <TabsTrigger value="taxonomy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Tags className="h-3.5 w-3.5 mr-1.5" />
            Taxonomy
          </TabsTrigger>
          <TabsTrigger value="customFields" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="marketingLists" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Marketing Lists
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {section1 === "detail" && contactDetailContent}
          {section1 === "taxonomy" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Taxonomy</h2>
                <p className="text-xs text-muted-foreground mb-4">Categories and tags for this contact.</p>
                <ContactTaxonomyBlock contactId={contactId} initialStatus={contactStatus} contactStatuses={contactStatuses} hideStatus />
              </CardContent>
            </Card>
          )}
          {section1 === "customFields" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Custom Fields</h2>
                <p className="text-xs text-muted-foreground mb-4">Form and contact-specific custom field values.</p>
                <ContactDetailClient {...detailClientProps} activeSection="customFields" />
              </CardContent>
            </Card>
          )}
          {section1 === "marketingLists" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Marketing Lists</h2>
                <p className="text-xs text-muted-foreground mb-4">Lists this contact is subscribed to.</p>
                <ContactDetailClient {...detailClientProps} activeSection="marketingLists" />
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>

      {/* Section 2: Action items — Activity Stream (default) | Memberships | Projects | Transactions */}
      <Tabs value={section2} onValueChange={(v) => setSection2(v as Section2Tab)} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto border-b">
          <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Activity Stream
          </TabsTrigger>
          <TabsTrigger value="memberships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Memberships
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <FolderKanban className="h-3.5 w-3.5 mr-1.5" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            Transactions
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {section2 === "activity" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Activity Stream</h2>
                <p className="text-xs text-muted-foreground mb-4">Timestamped activities for this contact, including custom notes.</p>
                <ContactDetailClient {...detailClientProps} activeSection="notes" />
              </CardContent>
            </Card>
          )}
          {section2 === "memberships" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Memberships</h2>
                <p className="text-xs text-muted-foreground mb-4">Membership access groups (MAGs) for this contact.</p>
                <ContactDetailClient {...detailClientProps} activeSection="mags" />
              </CardContent>
            </Card>
          )}
          {section2 === "projects" && (
            <Card className="rounded-lg border bg-card min-h-[300px]">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold mb-1">Projects</h2>
                <p className="text-xs text-muted-foreground">Projects for this contact. (Coming in a future update.)</p>
              </CardContent>
            </Card>
          )}
          {section2 === "transactions" && (
            <ContactTransactionsTab contactId={contactId} contactEmail={contactEmail} displayName={displayName} />
          )}
        </div>
      </Tabs>
    </div>
  );
}
