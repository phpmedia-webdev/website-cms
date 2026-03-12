import { getContentListWithTypes } from "@/lib/supabase/content";
import { TemplatesListClient } from "./TemplatesListClient";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const all = await getContentListWithTypes();
  const templates = all.filter((c) => c.type_slug === "template");
  return (
    <div className="p-6">
      <TemplatesListClient initialTemplates={templates} />
    </div>
  );
}
