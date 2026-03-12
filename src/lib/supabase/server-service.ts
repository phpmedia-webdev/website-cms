/**
 * Server-only Supabase client for service-role operations.
 * Uses only @supabase/supabase-js — no @supabase/ssr, no auth-js.
 * Use this for public-facing code (e.g. loading form config for Contact) so those
 * routes never pull in auth/cookie code and avoid vendor-chunk issues.
 */

import { getSupabaseEnv } from "./supabase-env";

export function createServerSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
