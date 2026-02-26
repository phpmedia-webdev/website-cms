import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { CodeLibraryListClient } from "./CodeLibraryListClient";

/**
 * Superadmin Code Library. List view: Title, Type, Description.
 * Only accessible to superadmin.
 */
export default async function CodeLibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Code Library</h1>
        <p className="text-muted-foreground mt-2">
          Reusable code (sections, pages, layout). Copy to donor folder for AI or hand refinement.
        </p>
      </div>

      <CodeLibraryListClient />
    </div>
  );
}
