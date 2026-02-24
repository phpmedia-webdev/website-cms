import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";

type PageProps = { params: Promise<{ roleSlug: string }> };

/**
 * M5: Role editing is in PHP-Auth. Redirect to read-only Roles list.
 */
export default async function SuperadminRoleEditorPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  await params; // consume for route segment
  redirect("/admin/super/roles?m=php-auth");
}
