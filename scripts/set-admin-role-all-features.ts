/**
 * One-time script: set the "admin" role to have all features enabled.
 * Run: pnpm tsx scripts/set-admin-role-all-features.ts
 * Uses SUPABASE_SERVICE_ROLE_KEY; no seed in migrations.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_ROLE_SLUG = "admin";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: features, error: listError } = await supabase
    .from("feature_registry")
    .select("id")
    .eq("is_enabled", true)
    .order("display_order", { ascending: true });

  if (listError) {
    console.error("Failed to list features:", listError);
    process.exit(1);
  }

  const featureIds = (features ?? []).map((r: { id: string }) => r.id);
  if (featureIds.length === 0) {
    console.error("No enabled features in feature_registry.");
    process.exit(1);
  }

  const { error: deleteError } = await supabase
    .from("role_features")
    .delete()
    .eq("role_slug", ADMIN_ROLE_SLUG);

  if (deleteError) {
    console.error("Failed to clear existing admin role features:", deleteError);
    process.exit(1);
  }

  const payload = featureIds.map((feature_id: string) => ({
    role_slug: ADMIN_ROLE_SLUG,
    feature_id,
    is_enabled: true,
  }));

  const { error: insertError } = await supabase.from("role_features").insert(payload);

  if (insertError) {
    console.error("Failed to insert admin role features:", insertError);
    process.exit(1);
  }

  console.log(`Admin role updated: ${featureIds.length} features enabled (all toggles on).`);
}

main();
