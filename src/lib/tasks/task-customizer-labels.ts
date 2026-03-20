/**
 * Resolve display labels for task Customizer scopes (e.g. CRM log on status change).
 */

import { getCustomizerOptions } from "@/lib/supabase/settings";
import { getClientSchema } from "@/lib/supabase/schema";

export async function getTaskStatusLabelForSlug(
  slug: string,
  schema?: string
): Promise<string> {
  const schemaName = schema ?? getClientSchema();
  const rows = await getCustomizerOptions("task_status", schemaName);
  const key = slug.trim().toLowerCase();
  const row = rows.find((r) => String(r.slug ?? "").trim().toLowerCase() === key);
  const label = row?.label != null ? String(row.label).trim() : "";
  return label || slug;
}
