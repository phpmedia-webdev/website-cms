import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { CodeLibraryFormClient } from "../CodeLibraryFormClient";

/**
 * Superadmin: create new code library entry.
 */
export default async function NewCodeLibraryEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add code library entry</h1>
        <p className="text-muted-foreground mt-2">
          Add a reusable code block (section, page, layout) to the library.
        </p>
      </div>

      <CodeLibraryFormClient />
    </div>
  );
}
