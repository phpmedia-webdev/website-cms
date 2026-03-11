/**
 * Product list helpers (Phase 09 Ecommerce).
 * Content type "product" + tenant schema product table.
 */

import { createClientSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/client";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Product row (tenant schema product table). */
export interface ProductRow {
  id: string;
  content_id: string;
  price: number;
  currency: string;
  stripe_product_id: string | null;
  sku: string | null;
  stock_quantity: number | null;
  gallery_id: string | null;
  taxable: boolean;
  shippable: boolean;
  available_for_purchase: boolean;
  /** MAG ids that can see this product on the shop (when access_level is mag). Independent of grant-on-purchase. */
  visibility_mag_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  content_type_id: string;
  type_slug: string;
  type_label: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  /** Product row id (null if product row not yet created). */
  product_id: string | null;
  price: number;
  currency: string;
  stripe_product_id: string | null;
  sku: string | null;
  available_for_purchase: boolean;
}

/**
 * Server-only: list all content items of type "product" with joined product row.
 * Uses tenant schema. Left-joins product so content without a product row still appears.
 */
export async function getProductList(
  schema?: string
): Promise<ProductListItem[]> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;

  const { data: typeRow } = await supabase
    .schema(schemaName)
    .from("content_types")
    .select("id")
    .eq("slug", "product")
    .maybeSingle();

  if (!typeRow) return [];

  const { data: contentRows, error: contentError } = await supabase
    .schema(schemaName)
    .from("content")
    .select("id, content_type_id, title, slug, status, updated_at")
    .eq("content_type_id", typeRow.id)
    .order("updated_at", { ascending: false });

  if (contentError) {
    console.error("getProductList content:", contentError);
    return [];
  }

  const contentList = (contentRows ?? []) as {
    id: string;
    content_type_id: string;
    title: string;
    slug: string;
    status: string;
    updated_at: string;
  }[];

  if (contentList.length === 0) return [];

  const contentIds = contentList.map((c) => c.id);
  const { data: productRows } = await supabase
    .schema(schemaName)
    .from("product")
    .select("id, content_id, price, currency, stripe_product_id, sku, available_for_purchase")
    .in("content_id", contentIds);

  const productByContentId = new Map<
    string,
    {
      id: string;
      price: number;
      currency: string;
      stripe_product_id: string | null;
      sku: string | null;
      available_for_purchase: boolean;
    }
  >();
  for (const p of productRows ?? []) {
    const row = p as {
      id: string;
      content_id: string;
      price: number;
      currency: string;
      stripe_product_id: string | null;
      sku: string | null;
      available_for_purchase: boolean;
    };
    productByContentId.set(row.content_id, {
      id: row.id,
      price: Number(row.price),
      currency: row.currency,
      stripe_product_id: row.stripe_product_id,
      sku: row.sku,
      available_for_purchase: row.available_for_purchase,
    });
  }

  return contentList.map((c) => {
    const p = productByContentId.get(c.id);
    return {
      id: c.id,
      content_type_id: c.content_type_id,
      type_slug: "product",
      type_label: "Product",
      title: c.title,
      slug: c.slug,
      status: c.status,
      updated_at: c.updated_at,
      product_id: p?.id ?? null,
      price: p?.price ?? 0,
      currency: p?.currency ?? "USD",
      stripe_product_id: p?.stripe_product_id ?? null,
      sku: p?.sku ?? null,
      available_for_purchase: p?.available_for_purchase ?? true,
    };
  });
}

/**
 * Server-only: get product row by content id (for edit page).
 */
export async function getProductByContentId(
  contentId: string,
  schema?: string
): Promise<ProductRow | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("product")
    .select("*")
    .eq("content_id", contentId)
    .maybeSingle();
  if (error) {
    console.error("getProductByContentId:", error);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, unknown>;
  const rawVisibility = r.visibility_mag_ids;
  const visibility_mag_ids = Array.isArray(rawVisibility)
    ? (rawVisibility as unknown[]).map((x) => String(x))
    : [];
  return {
    id: r.id as string,
    content_id: r.content_id as string,
    price: Number(r.price),
    currency: (r.currency as string) ?? "USD",
    stripe_product_id: (r.stripe_product_id as string | null) ?? null,
    sku: (r.sku as string | null) ?? null,
    stock_quantity: r.stock_quantity != null ? Number(r.stock_quantity) : null,
    gallery_id: (r.gallery_id as string | null) ?? null,
    taxable: Boolean(r.taxable),
    shippable: Boolean(r.shippable),
    available_for_purchase: Boolean(r.available_for_purchase),
    visibility_mag_ids,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

/**
 * Client or server: insert product row (after content is created).
 */
export async function insertProductRow(row: {
  content_id: string;
  price?: number;
  currency?: string;
  sku?: string | null;
  stock_quantity?: number | null;
  gallery_id?: string | null;
  taxable?: boolean;
  shippable?: boolean;
  available_for_purchase?: boolean;
  visibility_mag_ids?: string[];
}): Promise<{ id: string } | null> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("product")
    .insert({
      content_id: row.content_id,
      price: row.price ?? 0,
      currency: row.currency ?? "USD",
      sku: row.sku ?? null,
      stock_quantity: row.stock_quantity ?? null,
      gallery_id: row.gallery_id ?? null,
      taxable: row.taxable ?? true,
      shippable: row.shippable ?? false,
      available_for_purchase: row.available_for_purchase ?? true,
      visibility_mag_ids: row.visibility_mag_ids ?? [],
    })
    .select("id")
    .single();
  if (error) {
    console.error("insertProductRow:", error);
    return null;
  }
  return data as { id: string };
}

/**
 * Client or server: update product row by content_id.
 */
export async function updateProductRow(
  contentId: string,
  row: Partial<{
    price: number;
    currency: string;
    sku: string | null;
    stock_quantity: number | null;
    gallery_id: string | null;
    taxable: boolean;
    shippable: boolean;
    available_for_purchase: boolean;
    visibility_mag_ids: string[];
  }>
): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("product")
    .update(row)
    .eq("content_id", contentId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("updateProductRow:", error);
    return false;
  }
  return data != null;
}
