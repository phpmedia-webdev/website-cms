import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getCodeSnippetById } from "@/lib/supabase/code-snippets";
import { CodeLibraryDetailClient } from "./CodeLibraryDetailClient";

/**
 * Superadmin code library entry detail: full details + code window + Copy.
 */
export default async function CodeLibraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/dashboard");
  const role = await getRoleForCurrentUser();
  if (!isSuperadminFromRole(role)) redirect("/admin/dashboard");

  const { id } = await params;
  const snippet = await getCodeSnippetById(id);
  if (!snippet) notFound();

  return (
    <div className="space-y-6">
      <CodeLibraryDetailClient snippet={snippet} />
    </div>
  );
}
