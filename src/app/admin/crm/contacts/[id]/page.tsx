import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContactById,
  getContactNotes,
  getCrmCustomFields,
  getContactCustomFields,
  getForms,
  getFormSubmissionsByContactId,
  getContactMags,
  getContactMarketingLists,
  getMarketingLists,
} from "@/lib/supabase/crm";
import { getCrmNoteTypes, getCrmContactStatuses } from "@/lib/supabase/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Building2, MapPin, User } from "lucide-react";
import { ContactDetailClient } from "./ContactDetailClient";
import { ContactTaxonomyBlock } from "./ContactTaxonomyBlock";
import { ContactCardStatusBadge } from "./ContactCardStatusBadge";
import { ContactDetailTabs } from "./ContactDetailTabs";
import { CopyMessageToNotesButton } from "./CopyMessageToNotesButton";
import { ContactDeleteButton } from "./ContactDeleteButton";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, notes, customFieldDefinitions, contactCustomFieldValues, forms, formSubmissions, mags, contactMarketingLists, allMarketingLists, noteTypes, contactStatuses] =
    await Promise.all([
      getContactById(id),
      getContactNotes(id),
      getCrmCustomFields(),
      getContactCustomFields(id),
      getForms(),
      getFormSubmissionsByContactId(id),
      getContactMags(id),
      getContactMarketingLists(id),
      getMarketingLists(),
      getCrmNoteTypes(),
      getCrmContactStatuses(),
    ]);

  if (!contact) {
    notFound();
  }

  const sourceLabel =
    contact.source ||
    (contact.form_id && forms.find((f) => f.id === contact.form_id)?.name) ||
    "—";

  const displayName =
    contact.full_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "Contact";

  return (
    <div className="space-y-4">
      {/* Back to Contacts */}
      <Link
        href="/admin/crm/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      {/* Contact card — design: name + company top left; status + Edit top right; Contact Information | Address; then Form Submission Message */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          {/* Top row: name + company (left), status badge + Edit (right) */}
          <div className="flex flex-row items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              {contact.company && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{contact.company}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ContactCardStatusBadge
                contactId={id}
                status={contact.status}
                contactStatuses={contactStatuses}
              />
              <Link href={`/admin/crm/contacts/${id}/edit`}>
                <Button variant="outline" size="sm" className="h-8">
                  Edit
                </Button>
              </Link>
              <ContactDeleteButton contactId={id} displayName={displayName} />
            </div>
          </div>

          {/* Two columns: Contact Information | Address */}
          <div className="grid gap-6 md:grid-cols-2 mb-4">
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Contact Information
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {contact.last_name || contact.full_name
                      ? [contact.last_name, contact.full_name].filter(Boolean).join(", ")
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{contact.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{contact.company || "—"}</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Address
              </h2>
              <div className="space-y-1.5 text-sm">
                {(contact.address || contact.city || contact.state || contact.postal_code || contact.country) ? (
                  <>
                    {contact.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                        <span>{contact.address}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {contact.city && <span>{contact.city}</span>}
                      {contact.state && <span>{contact.state}</span>}
                      {contact.postal_code && <span>{contact.postal_code}</span>}
                      {contact.country && <span>{contact.country}</span>}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Form Submission Message — full width */}
          <div className="border-t pt-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Form Submission Message
            </h2>
            <div className="rounded border bg-muted/30 px-3 py-2 min-h-[5rem] overflow-y-auto whitespace-pre-wrap text-sm">
              {contact.message?.trim() ? contact.message : "—"}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-[10px] text-muted-foreground">Source: {sourceLabel}</p>
              <CopyMessageToNotesButton contactId={id} message={contact.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed section: Activity Stream | Taxonomy | Custom Fields | Marketing Lists | Memberships */}
      <ContactDetailTabs
        contactId={id}
        initialNotes={notes}
        contactCreatedAt={contact.created_at}
        initialFormSubmissions={formSubmissions}
        formNameById={Object.fromEntries(forms.map((f) => [f.id, f.name]))}
        initialCustomFieldDefinitions={customFieldDefinitions}
        initialContactCustomFieldValues={contactCustomFieldValues}
        initialForms={forms}
        contactFormId={contact.form_id ?? null}
        initialMags={mags}
        initialMarketingLists={contactMarketingLists}
        allMarketingLists={allMarketingLists}
        initialNoteTypes={noteTypes}
        contactStatus={contact.status}
        contactStatuses={contactStatuses}
      />
    </div>
  );
}
