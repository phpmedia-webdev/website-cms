import { getContactById } from "@/lib/supabase/crm";
import { InvoiceNewClient } from "./InvoiceNewClient";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ contact_id?: string }>;
}) {
  const params = await searchParams;
  const contactId = params.contact_id?.trim();
  const initialContact =
    contactId
      ? await getContactById(contactId).then((c) =>
          c
            ? {
                id: c.id,
                email: c.email ?? null,
                first_name: c.first_name ?? null,
                last_name: c.last_name ?? null,
                full_name: c.full_name ?? null,
              }
            : null
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New invoice</h1>
        <p className="text-muted-foreground mt-2">
          {initialContact
            ? "Customer is pre-filled from the contact. Add line items on the next screen."
            : "Search for a customer by name or email, or enter an email manually. You will add line items on the next screen."}
        </p>
      </div>
      <InvoiceNewClient initialContact={initialContact} />
    </div>
  );
}
