import { redirect } from "next/navigation";

/**
 * Security settings moved to Superadmin → Security.
 * Redirect old bookmarks and links.
 */
export default function SecuritySettingsRedirect() {
  redirect("/admin/super/security");
}
