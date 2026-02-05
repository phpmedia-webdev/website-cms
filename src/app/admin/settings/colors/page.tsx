import { redirect } from "next/navigation";

export default function ColorsSettingsRedirect() {
  redirect("/admin/settings/style?tab=colors");
}
