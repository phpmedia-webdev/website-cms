import { redirect } from "next/navigation";

/**
 * New membership is created via the modal on the list page.
 * Redirect old /admin/crm/memberships/new links to the list.
 */
export default function NewMAGRedirect() {
  redirect("/admin/crm/memberships");
}
