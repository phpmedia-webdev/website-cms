import { redirect } from "next/navigation";

export default function CrmSettingsRedirect() {
  redirect("/admin/settings/customizer?tab=crm");
}
