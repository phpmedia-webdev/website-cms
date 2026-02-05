import { redirect } from "next/navigation";

export default function FontsSettingsRedirect() {
  redirect("/admin/settings/style?tab=fonts");
}
