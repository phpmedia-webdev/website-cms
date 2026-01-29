import Link from "next/link";
import { notFound } from "next/navigation";
import { getContactById } from "@/lib/supabase/crm";
import { getCrmContactStatuses } from "@/lib/supabase/settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ContactEditForm } from "./ContactEditForm";

export default async function ContactEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, contactStatuses] = await Promise.all([
    getContactById(id),
    getCrmContactStatuses(),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/crm/contacts/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit contact</h1>
          <p className="text-muted-foreground mt-1">
            {contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || id}
          </p>
        </div>
      </div>
      <ContactEditForm contact={contact} contactStatuses={contactStatuses} />
    </div>
  );
}
