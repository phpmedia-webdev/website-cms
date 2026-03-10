import { redirect } from "next/navigation";

export default function ButtonsSettingsRedirect() {
  redirect("/admin/settings/style?tab=buttons");
}
