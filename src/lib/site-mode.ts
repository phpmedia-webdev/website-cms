/**
 * Site mode (coming_soon | live) for middleware.
 * Edge-safe: only uses process.env and @supabase/supabase-js createClient.
 * Used to decide whether to redirect public routes to /coming-soon.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Fetch that disables cache so middleware always gets fresh site_mode from DB. */
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

/**
 * Get effective site mode for the current deployment (middleware / Edge).
 * 1) If NEXT_PUBLIC_CLIENT_SCHEMA is set, read site_mode from public.tenant_sites (by schema_name).
 *    - Uses no-store fetch so we never use a cached "coming_soon" response.
 *    - If the DB lookup fails or returns no row, default to "live".
 * 2) If schema is not set (e.g. missing in Edge), default to "live".
 */
export async function getSiteModeForEdge(): Promise<string> {
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA?.trim();
  if (!schema) {
    return "live";
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return "live";
  }
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: noStoreFetch },
    });
    const { data, error } = await supabase
      .from("tenant_sites")
      .select("site_mode")
      .eq("schema_name", schema)
      .maybeSingle();
    if (error || !data?.site_mode) {
      return "live";
    }
    const mode = String(data.site_mode).trim().toLowerCase();
    return mode === "coming_soon" ? "coming_soon" : "live";
  } catch {
    return "live";
  }
}
