/**
 * One-time script to add Test Gallery shortcode to homepage.
 * Run: pnpm tsx scripts/add-gallery-to-homepage.ts
 *
 * Fetches gallery by slug "test-gallery", finds homepage (page with slug "/"),
 * appends [[gallery-id]] to the body, and saves.
 * If homepage doesn't exist, creates it with the shortcode.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Get gallery by slug "test-gallery"
  const { data: gallery, error: galleryErr } = await supabase
    .schema(schema)
    .from("galleries")
    .select("id, name, slug")
    .eq("slug", "test-gallery")
    .maybeSingle();

  if (galleryErr || !gallery) {
    console.error("Gallery not found (slug=test-gallery):", galleryErr?.message ?? "no match");
    process.exit(1);
  }

  const shortcode = `[[${gallery.id}]]`;
  console.log(`Gallery: ${gallery.name} (${gallery.slug}) → UUID ${gallery.id}`);
  console.log(`Shortcode: ${shortcode}`);

  // 2. Get content type "page"
  const { data: pageType, error: typeErr } = await supabase
    .schema(schema)
    .from("content_types")
    .select("id")
    .eq("slug", "page")
    .maybeSingle();

  if (typeErr || !pageType) {
    console.error("Content type 'page' not found:", typeErr?.message ?? "no match");
    process.exit(1);
  }

  // 3. Find homepage (page with slug "/") or first published page
  let page: { id: string; title: string; slug: string; body: unknown } | null = null;
  const { data: homePage } = await supabase
    .schema(schema)
    .from("content")
    .select("id, title, slug, body")
    .eq("content_type_id", pageType.id)
    .eq("slug", "/")
    .maybeSingle();

  if (homePage) {
    page = homePage;
  } else {
    const { data: firstPage } = await supabase
      .schema(schema)
      .from("content")
      .select("id, title, slug, body")
      .eq("content_type_id", pageType.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (firstPage) {
      page = firstPage;
      console.log(`Homepage (slug=/) not found. Using first page: "${firstPage.title}" (slug=${firstPage.slug})`);
    }
  }

  if (!page) {
    // Create homepage
    const newBody = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Welcome" }] },
        { type: "paragraph", content: [{ type: "text", text: shortcode }] },
      ],
    };
    const { data: inserted, error: insertErr } = await supabase
      .schema(schema)
      .from("content")
      .insert({
        content_type_id: pageType.id,
        title: "Home",
        slug: "/",
        body: newBody,
        excerpt: null,
        featured_image_id: null,
        status: "published",
        published_at: new Date().toISOString(),
        custom_fields: {},
      })
      .select("id, title, slug")
      .single();

    if (insertErr) {
      console.error("Failed to create homepage:", insertErr.message);
      process.exit(1);
    }
    console.log(`Created homepage "${inserted.title}" (slug=${inserted.slug}) with gallery shortcode.`);
    return;
  }

  // 4. Build updated body: append paragraph with shortcode
  const body = page.body as { type?: string; content?: unknown[] } | null;
  const content = Array.isArray(body?.content) ? [...body.content] : [];

  const shortcodeParagraph = {
    type: "paragraph",
    content: [{ type: "text", text: shortcode }],
  };
  content.push(shortcodeParagraph);

  const newBody = {
    type: body?.type ?? "doc",
    content,
  };

  const { error: updateErr } = await supabase
    .schema(schema)
    .from("content")
    .update({ body: newBody })
    .eq("id", page.id);

  if (updateErr) {
    console.error("Failed to update page:", updateErr.message);
    process.exit(1);
  }

  console.log(`Page "${page.title}" (slug=${page.slug}) updated. Shortcode added to body.`);
  console.log("View at: / (if slug=/) or /" + (page.slug === "/" ? "" : page.slug));
}

main();
