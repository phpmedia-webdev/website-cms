/**
 * Step 43: Stripe ↔ app product drift.
 * Compare Stripe Products (and Prices) to app products; report in Stripe not in app,
 * in app not in Stripe, and differing (name/price).
 */

import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/config";
import { createServerSupabaseClient } from "@/lib/supabase/client";
const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface StripeProductSummary {
  id: string;
  name: string;
  description: string | null;
  /** Default price id (one-time or first recurring). */
  default_price_id: string | null;
  /** Unit amount in cents (from default price). */
  unit_amount: number | null;
  currency: string;
  /** Recurring interval if default price is recurring. */
  recurring_interval: "month" | "year" | null;
}

export interface AppProductStripeRef {
  content_id: string;
  title: string;
  price: number;
  currency: string;
  stripe_product_id: string;
  stripe_price_id: string | null;
}

export interface DriftItemStripeOnly {
  kind: "in_stripe_not_in_app";
  stripe_product: StripeProductSummary;
}

export interface DriftItemAppOnly {
  kind: "in_app_not_in_stripe";
  app_product: AppProductStripeRef;
}

export interface DriftItemDiffering {
  kind: "differing";
  stripe_product: StripeProductSummary;
  app_product: AppProductStripeRef;
  /** Human-readable diff (e.g. "Name differs", "Price differs"). */
  differences: string[];
}

export type DriftItem =
  | DriftItemStripeOnly
  | DriftItemAppOnly
  | DriftItemDiffering;

export interface StripeDriftReport {
  ok: boolean;
  error?: string;
  inStripeNotInApp: DriftItemStripeOnly[];
  inAppNotInStripe: DriftItemAppOnly[];
  differing: DriftItemDiffering[];
}

function stripeProductToSummary(p: Stripe.Product): StripeProductSummary {
  const defaultPrice = p.default_price as Stripe.Price | string | null;
  let default_price_id: string | null = null;
  let unit_amount: number | null = null;
  let currency = "usd";
  let recurring_interval: "month" | "year" | null = null;
  if (defaultPrice && typeof defaultPrice === "object") {
    default_price_id = defaultPrice.id;
    unit_amount = defaultPrice.unit_amount;
    currency = defaultPrice.currency ?? "usd";
    if (defaultPrice.recurring?.interval) {
      recurring_interval =
        defaultPrice.recurring.interval === "month"
          ? "month"
          : defaultPrice.recurring.interval === "year"
            ? "year"
            : null;
    }
  } else if (typeof defaultPrice === "string") {
    default_price_id = defaultPrice;
  }
  return {
    id: p.id,
    name: p.name ?? "",
    description: p.description ?? null,
    default_price_id,
    unit_amount: unit_amount ?? null,
    currency,
    recurring_interval,
  };
}

/** Server-only: load app products that have stripe_product_id set. */
async function getAppProductsWithStripeIds(
  schema: string
): Promise<AppProductStripeRef[]> {
  const supabase = createServerSupabaseClient();
  const { data: typeRow } = await supabase
    .schema(schema)
    .from("content_types")
    .select("id")
    .eq("slug", "product")
    .maybeSingle();
  if (!typeRow) return [];

  const { data: contentRows } = await supabase
    .schema(schema)
    .from("content")
    .select("id, title")
    .eq("content_type_id", typeRow.id);
  const contentIds = (contentRows ?? []).map((r: { id: string }) => r.id);
  if (contentIds.length === 0) return [];

  const { data: productRows } = await supabase
    .schema(schema)
    .from("product")
    .select("content_id, price, currency, stripe_product_id, stripe_price_id")
    .not("stripe_product_id", "is", null)
    .in("content_id", contentIds);

  const contentById = new Map<string, string>(
    (contentRows ?? []).map((r: { id: string; title: string }) => [r.id, r.title])
  );
  const out: AppProductStripeRef[] = [];
  for (const row of productRows ?? []) {
    const r = row as {
      content_id: string;
      price: number;
      currency: string;
      stripe_product_id: string;
      stripe_price_id: string | null;
    };
    out.push({
      content_id: r.content_id,
      title: contentById.get(r.content_id) ?? "",
      price: Number(r.price),
      currency: r.currency ?? "USD",
      stripe_product_id: r.stripe_product_id,
      stripe_price_id: r.stripe_price_id ?? null,
    });
  }
  return out;
}

/**
 * Server-only: build drift report between Stripe and app products.
 */
export async function getStripeDriftReport(
  schema?: string
): Promise<StripeDriftReport> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
      inStripeNotInApp: [],
      inAppNotInStripe: [],
      differing: [],
    };
  }

  try {
    const [stripeProducts, appProducts] = await Promise.all([
      (async () => {
        const list: Stripe.Product[] = [];
        let hasMore = true;
        let startingAfter: string | undefined;
        while (hasMore) {
          const res = await stripe.products.list({
            limit: 100,
            starting_after: startingAfter,
            expand: ["data.default_price"],
          });
          list.push(...res.data);
          hasMore = res.has_more;
          if (res.data.length) startingAfter = res.data[res.data.length - 1].id;
        }
        return list.map(stripeProductToSummary);
      })(),
      getAppProductsWithStripeIds(schemaName),
    ]);

    const stripeById = new Map(stripeProducts.map((p) => [p.id, p]));
    const appByStripeProductId = new Map(
      appProducts.map((a) => [a.stripe_product_id, a])
    );

    const inStripeNotInApp: DriftItemStripeOnly[] = [];
    const inAppNotInStripe: DriftItemAppOnly[] = [];
    const differing: DriftItemDiffering[] = [];

    for (const sp of stripeProducts) {
      const appProduct = appByStripeProductId.get(sp.id);
      if (!appProduct) {
        inStripeNotInApp.push({ kind: "in_stripe_not_in_app", stripe_product: sp });
        continue;
      }
      const diffs: string[] = [];
      if (sp.name !== appProduct.title) {
        diffs.push(`Name: Stripe "${sp.name}" vs app "${appProduct.title}"`);
      }
      const stripePriceDollars = sp.unit_amount != null ? sp.unit_amount / 100 : null;
      const appPriceDollars = appProduct.price;
      if (stripePriceDollars != null && Math.abs(stripePriceDollars - appPriceDollars) > 0.005) {
        diffs.push(
          `Price: Stripe ${stripePriceDollars.toFixed(2)} ${sp.currency} vs app ${appPriceDollars.toFixed(2)} ${appProduct.currency}`
        );
      }
      if (diffs.length > 0) {
        differing.push({
          kind: "differing",
          stripe_product: sp,
          app_product: appProduct,
          differences: diffs,
        });
      }
    }

    for (const appProduct of appProducts) {
      if (!stripeById.has(appProduct.stripe_product_id)) {
        inAppNotInStripe.push({
          kind: "in_app_not_in_stripe",
          app_product: appProduct,
        });
      }
    }

    return {
      ok: true,
      inStripeNotInApp,
      inAppNotInStripe,
      differing,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("getStripeDriftReport:", e);
    return {
      ok: false,
      error: message,
      inStripeNotInApp: [],
      inAppNotInStripe: [],
      differing: [],
    };
  }
}

/** Step 44: Slug from product name for import. */
function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "product";
}

/**
 * Step 44: Import a single Stripe product into the app (create content + product row).
 * Used by single-import API and bulk import. Idempotent: returns error if app product already linked to this Stripe product.
 */
export async function importStripeProductIntoApp(
  stripeProductId: string,
  schema?: string
): Promise<
  | { success: true; content_id: string; slug: string; title: string }
  | { success: false; error: string }
> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const stripe = getStripeClient();
  if (!stripe) {
    return { success: false, error: "Stripe is not configured." };
  }

  try {
    const stripeProduct = (await stripe.products.retrieve(stripeProductId, {
      expand: ["default_price"],
    })) as Stripe.Product | null;
    if (!stripeProduct || (stripeProduct as { deleted?: boolean }).deleted) {
      return { success: false, error: "Stripe product not found or deleted" };
    }

    const supabase = createServerSupabaseClient();
    const { data: typeRow } = await supabase
      .schema(schemaName)
      .from("content_types")
      .select("id")
      .eq("slug", "product")
      .maybeSingle();
    if (!typeRow) {
      return { success: false, error: "Content type 'product' not found" };
    }

    const existing = await supabase
      .schema(schemaName)
      .from("product")
      .select("content_id")
      .eq("stripe_product_id", stripeProductId)
      .maybeSingle();
    if (existing.data) {
      return {
        success: false,
        error: "App product already linked to this Stripe product",
      };
    }

    const name = stripeProduct.name ?? "Imported Product";
    const defaultPrice = stripeProduct.default_price as {
      unit_amount?: number;
      currency?: string;
      id?: string;
      recurring?: { interval?: string };
    } | null;
    const priceDollars =
      defaultPrice?.unit_amount != null ? defaultPrice.unit_amount / 100 : 0;
    const currency = (defaultPrice?.currency ?? "usd").toUpperCase();
    const stripePriceId = defaultPrice?.id ?? null;
    const isRecurring = !!defaultPrice?.recurring?.interval;
    const billingInterval =
      defaultPrice?.recurring?.interval === "month"
        ? "month"
        : defaultPrice?.recurring?.interval === "year"
          ? "year"
          : null;

    let baseSlug = slugFromName(name);
    let slug = baseSlug;
    let n = 0;
    while (true) {
      const { data: conflict } = await supabase
        .schema(schemaName)
        .from("content")
        .select("id")
        .eq("content_type_id", typeRow.id)
        .eq("slug", slug)
        .maybeSingle();
      if (!conflict?.data) break;
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const { data: contentRow, error: contentError } = await supabase
      .schema(schemaName)
      .from("content")
      .insert({
        content_type_id: typeRow.id,
        title: name,
        slug,
        body: null,
        excerpt: stripeProduct.description?.slice(0, 500) ?? null,
        featured_image_id: null,
        status: "draft",
        published_at: null,
      })
      .select("id")
      .single();
    if (contentError || !contentRow) {
      console.error("importStripeProductIntoApp: content insert failed", contentError);
      return { success: false, error: "Failed to create content" };
    }
    const contentId = (contentRow as { id: string }).id;

    const productInsert: Record<string, unknown> = {
      content_id: contentId,
      price: priceDollars,
      currency,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
      taxable: true,
      shippable: false,
      available_for_purchase: false,
      is_recurring: isRecurring,
      billing_interval: billingInterval,
    };
    const { error: productError } = await supabase
      .schema(schemaName)
      .from("product")
      .insert(productInsert);
    if (productError) {
      console.error("importStripeProductIntoApp: product insert failed", productError);
      await supabase.schema(schemaName).from("content").delete().eq("id", contentId);
      return { success: false, error: "Failed to create product row" };
    }

    return {
      success: true,
      content_id: contentId,
      slug,
      title: name,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("importStripeProductIntoApp:", e);
    return { success: false, error: message };
  }
}

/**
 * Step 44: Bulk import all Stripe products that are not yet in the app.
 * Returns list of imported products and list of errors (by stripe_product_id).
 */
export async function bulkImportStripeProductsNotInApp(schema?: string): Promise<{
  imported: Array<{ content_id: string; slug: string; title: string }>;
  errors: Array<{ stripe_product_id: string; error: string }>;
}> {
  const report = await getStripeDriftReport(schema);
  const imported: Array<{ content_id: string; slug: string; title: string }> = [];
  const errors: Array<{ stripe_product_id: string; error: string }> = [];

  if (!report.ok || report.inStripeNotInApp.length === 0) {
    if (!report.ok && report.error) {
      errors.push({ stripe_product_id: "(report)", error: report.error });
    }
    return { imported, errors };
  }

  const schemaName = schema ?? CONTENT_SCHEMA;
  for (const item of report.inStripeNotInApp) {
    const id = item.stripe_product.id;
    const result = await importStripeProductIntoApp(id, schemaName);
    if (result.success) {
      imported.push({
        content_id: result.content_id,
        slug: result.slug,
        title: result.title,
      });
    } else {
      errors.push({ stripe_product_id: id, error: result.error });
    }
  }
  return { imported, errors };
}
