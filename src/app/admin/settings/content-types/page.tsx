import { redirect } from "next/navigation";

export default function ContentTypesSettingsRedirect() {
  redirect("/admin/settings/customizer?tab=content");
}
