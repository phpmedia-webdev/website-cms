/**
 * Quick verification: fetch homepage and log body.
 * Run: pnpm tsx scripts/verify-homepage-body.ts
 */
import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: pageType } = await supabase
    .schema(schema)
    .from("content_types")
    .select("id")
    .eq("slug", "page")
    .maybeSingle();

  if (!pageType) {
    console.log("No page content type");
    return;
  }

  const { data: page, error } = await supabase
    .schema(schema)
    .from("content")
    .select("id, title, slug, status, body")
    .eq("content_type_id", pageType.id)
    .eq("slug", "/")
    .maybeSingle();

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!page) {
    console.log("No homepage (slug=/) found");
    return;
  }

  console.log("Homepage found:", page.title, "| slug:", page.slug, "| status:", page.status);
  console.log("body type:", typeof page.body);
  console.log("body:", JSON.stringify(page.body, null, 2));
}

main();
