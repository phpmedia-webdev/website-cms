import { redirect } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { CodeSnippetsListClient } from "./CodeSnippetsListClient";

/**
 * Superadmin code snippets library. List view: Title, Type, Description.
 * Only accessible to superadmin.
 */
export default async function CodeSnippetsPage() {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Code Snippets</h1>
        <p className="text-muted-foreground mt-2">
          Reusable code (sections, pages, layout). Copy to donor folder for AI or hand refinement.
        </p>
      </div>

      <CodeSnippetsListClient />
    </div>
  );
}
