/**
 * POST /api/ecommerce/products/[id]/sync-stripe
 * Step 11: Create Stripe Product from CMS product. Loads content + product, resolves image URLs,
 * calls Stripe Products.create (no Price), saves stripe_product_id to product row.
 * [id] = content_id.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getContentByIdServer } from "@/lib/supabase/content";
import { getProductByContentId } from "@/lib/supabase/products";
import { getMediaById } from "@/lib/supabase/media";
import { getStripeClient } from "@/lib/stripe/config";
import { getSiteUrl } from "@/lib/supabase/settings";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Extract plain text from Tiptap-style body (max length for Stripe description). */
function plainTextFromBody(body: unknown, maxLen = 500): string {
  if (typeof body === "string") return body.slice(0, maxLen);
  if (!body || typeof body !== "object") return "";
  const doc = body as { content?: Array<{ content?: Array<{ text?: string }> }> };
  const parts: string[] = [];
  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }
  if (Array.isArray(doc.content)) doc.content.forEach(walk);
  return parts.join(" ").slice(0, maxLen).trim() || "";
}

/** Resolve absolute image URL for a media id; returns null if not found or not image. */
async function getImageUrlForStripe(mediaId: string, baseUrl: string): Promise<string | null> {
  try {
    const media = await getMediaById(mediaId);
    if (!media || media.media_type !== "image") return null;
    const url = media.variants?.[0]?.url ?? (media.variants as { url?: string }[] | undefined)?.[0]?.url;
    if (!url) return null;
    return url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  } catch {
    return null;
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contentId } = await params;
    if (!contentId) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY." },
        { status: 503 }
      );
    }

    const [content, product] = await Promise.all([
      getContentByIdServer(contentId),
      getProductByContentId(contentId),
    ]);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    if (!product) {
      return NextResponse.json(
        { error: "Product row not found. Save the product first." },
        { status: 400 }
      );
    }
    if (product.stripe_product_id) {
      return NextResponse.json(
        { error: "Product already synced to Stripe. Stripe Product ID is read-only." },
        { status: 400 }
      );
    }

    const baseUrl = (await getSiteUrl()).replace(/\/$/, "") || undefined;
    const imageIds: string[] = [];
    if (content.featured_image_id) imageIds.push(content.featured_image_id);
    if (product.gallery_id) {
      const supabase = createServerSupabaseClient();
      const schema = getClientSchema();
      const { data: items } = await supabase
        .schema(schema)
        .from("gallery_items")
        .select("media_id")
        .eq("gallery_id", product.gallery_id)
        .order("position", { ascending: true });
      for (const row of items ?? []) {
        const mid = (row as { media_id?: string }).media_id;
        if (mid && !imageIds.includes(mid)) imageIds.push(mid);
      }
    }

    const imageUrls: string[] = [];
    if (baseUrl) {
      for (const mid of imageIds) {
        const url = await getImageUrlForStripe(mid, baseUrl);
        if (url) imageUrls.push(url);
      }
    }

    const description =
      (content.excerpt as string)?.trim() ||
      plainTextFromBody(content.body) ||
      undefined;

    const stripeProduct = await stripe.products.create({
      name: (content.title as string) || "Untitled Product",
      description: description || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      metadata: {
        content_id: contentId,
        cms_product_id: product.id,
      },
    });

    const supabase = createServerSupabaseClient();
    const { error: updateError } = await supabase
      .schema(CONTENT_SCHEMA)
      .from("product")
      .update({ stripe_product_id: stripeProduct.id })
      .eq("content_id", contentId);
    if (updateError) {
      console.error("Sync Stripe: failed to save stripe_product_id", updateError);
      return NextResponse.json(
        { error: "Stripe product created but failed to save ID to database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stripe_product_id: stripeProduct.id,
    });
  } catch (err) {
    console.error("Sync to Stripe error:", err);
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
