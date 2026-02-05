import { redirect } from "next/navigation";

export default function ContentFieldsSettingsRedirect() {
  redirect("/admin/settings/customizer?tab=content");
}
