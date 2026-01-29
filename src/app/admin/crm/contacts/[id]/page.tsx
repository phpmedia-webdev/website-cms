import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContactById,
  getContactNotes,
  getContactCustomFields,
  getContactMags,
  getContactMarketingLists,
} from "@/lib/supabase/crm";
import { getCrmNoteTypes, getCrmContactStatuses } from "@/lib/supabase/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Phone, Building2, MapPin, MessageSquare } from "lucide-react";
import { ContactDetailClient } from "./ContactDetailClient";
import { ContactTaxonomyBlock } from "./ContactTaxonomyBlock";
import { CopyMessageToNotesButton } from "./CopyMessageToNotesButton";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, notes, customFields, mags, marketingLists, noteTypes, contactStatuses] = await Promise.all([
    getContactById(id),
    getContactNotes(id),
    getContactCustomFields(id),
    getContactMags(id),
    getContactMarketingLists(id),
    getCrmNoteTypes(),
    getCrmContactStatuses(),
  ]);

  if (!contact) {
    notFound();
  }

  const displayName =
    contact.full_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "Contact";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/crm/contacts">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {contact.status} {contact.company ? ` · ${contact.company}` : ""}
          </p>
        </div>
        <Link href={`/admin/crm/contacts/${id}/edit`}>
          <Button variant="outline" size="sm">Edit</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Contact (standard fields) — always show core fields with icons */}
        <Card className="overflow-hidden flex flex-col min-h-0">
          <CardHeader className="py-2 px-4 flex flex-row items-center justify-between gap-2 shrink-0">
            <CardTitle className="text-base">Contact</CardTitle>
            {(() => {
              const config = contactStatuses.find((s) => s.slug === contact.status);
              const label = config?.label ?? contact.status;
              if (config?.color) {
                return (
                  <span
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-white shrink-0"
                    style={{ backgroundColor: config.color }}
                  >
                    {label}
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted shrink-0">
                  {label}
                </span>
              );
            })()}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm pt-0 px-4 pb-4 flex-1 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {[contact.last_name, contact.first_name].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{contact.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{contact.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{contact.company || "—"}</span>
            </div>
            {(contact.address || contact.city || contact.state || contact.postal_code || contact.country) && (
              <div className="flex items-start gap-2 shrink-0">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">
                  {[contact.address, contact.city, contact.state, contact.postal_code, contact.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            <div className="flex flex-col flex-1 min-h-[8rem] pt-1">
              <p className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Message
              </p>
              <div className="rounded border bg-muted/30 px-2 py-1.5 flex-1 min-h-[6rem] overflow-y-auto whitespace-pre-wrap text-sm">
                {contact.message?.trim() ? contact.message : "—"}
              </div>
            </div>
            <div className="pt-1 flex flex-wrap gap-1.5 items-center justify-between shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {contact.dnd_status && contact.dnd_status !== "none" && (
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                    DND: {contact.dnd_status}
                  </span>
                )}
                {contact.source && (
                  <span className="text-muted-foreground text-xs">Source: {contact.source}</span>
                )}
              </div>
              <CopyMessageToNotesButton contactId={id} message={contact.message} />
            </div>
          </CardContent>
        </Card>

        {/* Right: Taxonomy (categories & tags) — client picker */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-base">Taxonomy</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <ContactTaxonomyBlock
              contactId={id}
              initialStatus={contact.status}
              contactStatuses={contactStatuses}
            />
          </CardContent>
        </Card>
      </div>

      {/* Notes and accordion sections - client component for interactivity */}
      <ContactDetailClient
        contactId={id}
        initialNotes={notes}
        initialCustomFields={customFields}
        initialMags={mags}
        initialMarketingLists={marketingLists}
        initialNoteTypes={noteTypes}
      />
    </div>
  );
}
