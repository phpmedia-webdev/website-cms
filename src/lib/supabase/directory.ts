/**
 * Unified Directory read model for admin pickers (CRM contacts + team users).
 * RPC: public.get_directory_search_dynamic (migrations 188 + 189 sort). See docs/prd-technical.md Phase 18C.
 * Server order: team_member rows first, then crm_contact; within each group by display_label (then source_id).
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema } from "./schema";
import { getTenantSiteBySchema } from "./tenant-sites";

export interface DirectoryEntry {
  source_type: "crm_contact" | "team_member";
  source_id: string;
  display_label: string;
  subtitle: string;
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

/**
 * Search merged directory (contacts + team on this tenant site). Admin callers only — enforce in route.
 * @param search - optional filter (case-insensitive substring on name/email/phone fields)
 * @param limit - max rows returned (capped)
 */
export async function searchDirectoryEntries(options?: {
  search?: string | null;
  limit?: number;
  schema?: string;
}): Promise<DirectoryEntry[]> {
  const schema = options?.schema?.trim() || getClientSchema();
  const rawLimit = options?.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
  const search = typeof options?.search === "string" ? options.search : "";

  const site = await getTenantSiteBySchema(schema);
  const tenantSiteId = site?.id ?? null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_directory_search_dynamic", {
    schema_name: schema,
    tenant_site_id: tenantSiteId,
    search_query: search,
    result_limit: limit,
  });

  if (error) {
    console.error("get_directory_search_dynamic:", error.message, error.code, error.details);
    return [];
  }

  const rows = (data ?? []) as Array<{
    source_type: string;
    source_id: string;
    display_label: string;
    subtitle: string;
  }>;

  return rows
    .filter(
      (r) =>
        (r.source_type === "crm_contact" || r.source_type === "team_member") &&
        typeof r.source_id === "string"
    )
    .map((r) => ({
      source_type: r.source_type as DirectoryEntry["source_type"],
      source_id: r.source_id,
      display_label: r.display_label?.trim() || (r.source_type === "crm_contact" ? "Contact" : "Team member"),
      subtitle: r.subtitle?.trim() ?? "",
    }));
}
