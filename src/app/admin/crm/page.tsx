import { redirect } from "next/navigation";

/**
 * /admin/crm — default to Contacts list view.
 */
export default function CrmPage() {
  redirect("/admin/crm/contacts");
}
