import { redirect, notFound } from "next/navigation";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getCodeSnippetById } from "@/lib/supabase/code-snippets";
import { CodeSnippetDetailClient } from "./CodeSnippetDetailClient";

/**
 * Superadmin code snippet detail: full details + code window + Copy.
 */
export default async function CodeSnippetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user || !isSuperadmin(user)) {
    redirect("/admin/dashboard");
  }

  const { id } = await params;
  const snippet = await getCodeSnippetById(id);
  if (!snippet) notFound();

  return (
    <div className="space-y-6">
      <CodeSnippetDetailClient snippet={snippet} />
    </div>
  );
}
