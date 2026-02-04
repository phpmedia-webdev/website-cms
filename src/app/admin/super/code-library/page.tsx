import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { CodeLibraryListClient } from "./CodeLibraryListClient";

/**
 * Superadmin Code Library. List view: Title, Type, Description.
 * Only accessible to superadmin.
 */
export default async function CodeLibraryPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

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
