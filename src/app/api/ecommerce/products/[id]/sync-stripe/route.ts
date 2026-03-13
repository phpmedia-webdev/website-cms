/**
 * POST /api/ecommerce/products/[id]/sync-stripe
 * Step 11: Create Stripe Product from CMS product. Loads content + product, resolves image URLs,
 * calls Stripe Products.create (no Price), saves stripe_product_id to product row.
 * Step 31: If product is subscription (is_recurring), also creates a recurring Price and saves stripe_price_id.
 * When product already has stripe_product_id but is_recurring and no stripe_price_id, creates only the recurring Price.
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

/** Product price in CMS is in dollars; Stripe expects cents. */
function toCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

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

    const needsStripeProduct = !product.stripe_product_id;
    const needsRecurringPrice =
      product.is_recurring &&
      product.stripe_product_id &&
      !product.stripe_price_id &&
      (product.billing_interval === "month" || product.billing_interval === "year");

    if (!needsStripeProduct && !needsRecurringPrice) {
      if (product.stripe_product_id && product.is_recurring && product.stripe_price_id) {
        return NextResponse.json(
          { error: "Product and recurring Price already synced to Stripe." },
          { status: 400 }
        );
      }
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

    let stripeProductId = product.stripe_product_id;

    if (needsStripeProduct) {
      const stripeProduct = await stripe.products.create({
        name: (content.title as string) || "Untitled Product",
        description: description || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        metadata: {
          content_id: contentId,
          cms_product_id: product.id,
        },
      });
      stripeProductId = stripeProduct.id;

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
    }

    let stripePriceId: string | null = product.stripe_price_id;
    const shouldCreateRecurringPrice =
      product.is_recurring &&
      stripeProductId &&
      !stripePriceId &&
      (product.billing_interval === "month" || product.billing_interval === "year");

    if (shouldCreateRecurringPrice && product.billing_interval && stripeProductId) {
      const currency = (product.currency || "USD").toLowerCase();
      const stripePrice = await stripe.prices.create({
        product: stripeProductId,
        currency,
        unit_amount: toCents(product.price),
        recurring: {
          interval: product.billing_interval,
        },
        metadata: {
          content_id: contentId,
          cms_product_id: product.id,
        },
      });
      stripePriceId = stripePrice.id;

      const supabase = createServerSupabaseClient();
      const { error: priceUpdateError } = await supabase
        .schema(CONTENT_SCHEMA)
        .from("product")
        .update({ stripe_price_id: stripePrice.id })
        .eq("content_id", contentId);
      if (priceUpdateError) {
        console.error("Sync Stripe: failed to save stripe_price_id", priceUpdateError);
        return NextResponse.json(
          { error: "Stripe recurring price created but failed to save ID to database." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId ?? undefined,
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
