import Link from "next/link";
import { notFound } from "next/navigation";
import { getContactById } from "@/lib/supabase/crm";
import { getContactOrganizations } from "@/lib/supabase/organizations";
import { listContactMethods } from "@/lib/supabase/contact-methods";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ContactEditForm } from "./ContactEditForm";
import { ContactDeleteButton } from "../ContactDeleteButton";

export default async function ContactEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, contactOrgs, contactMethods, contactStatuses] = await Promise.all([
    getContactById(id),
    getContactOrganizations(id),
    listContactMethods(id),
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/crm/contacts/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit contact</h1>
            <p className="text-muted-foreground mt-1">{displayName}</p>
          </div>
        </div>
        <ContactDeleteButton contactId={id} displayName={displayName} />
      </div>
      <ContactEditForm
        contact={contact}
        contactStatuses={contactStatuses}
        initialContactMethods={contactMethods}
        initialOrganizations={contactOrgs.map((l) => ({
          id: l.organization_id,
          name: l.organization?.name ?? "Organization",
        }))}
      />
    </div>
  );
}
