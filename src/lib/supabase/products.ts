/**
 * Product list helpers (Phase 09 Ecommerce).
 * Content type "product" + tenant schema product table.
 * Shop helpers (Step 7): eligibility + membership visibility for public catalog/detail.
 */

import { createClientSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/client";
import type { ShopViewer } from "@/lib/shop/viewer";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Catalog item for shop list (eligible + visible to viewer). */
export interface ShopProductListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_id: string | null;
  price: number;
  currency: string;
  taxable: boolean;
  shippable: boolean;
  updated_at: string;
}

/** Full product for shop detail page (eligible + visible to viewer). */
export interface ShopProductDetail {
  id: string;
  slug: string;
  title: string;
  body: Record<string, unknown> | null;
  excerpt: string | null;
  featured_image_id: string | null;
  status: string;
  access_level: string | null;
  price: number;
  currency: string;
  stripe_product_id: string | null;
  sku: string | null;
  stock_quantity: number | null;
  gallery_id: string | null;
  taxable: boolean;
  shippable: boolean;
  updated_at: string;
}

/**
 * Whether the current viewer can see this product (membership visibility).
 * When membership is disabled for tenant, everyone can see. Admins/superadmins bypass.
 */
export function canViewProduct(
  accessLevel: string | null | undefined,
  visibilityMagIds: string[],
  viewer: ShopViewer,
  membershipEnabled: boolean
): boolean {
  if (!membershipEnabled) return true;
  if (viewer.bypass) return true;
  const level = (accessLevel as "public" | "members" | "mag") ?? "public";
  if (!level || level === "public") return true;
  if (level === "members") return viewer.isMember;
  if (level === "mag") {
    if (visibilityMagIds.length === 0) return viewer.isMember;
    return visibilityMagIds.some((id) => viewer.magIds.includes(id));
  }
  return false;
}

/**
 * Server-only: list products eligible for shop and visible to viewer.
 * Eligibility: published + stripe_product_id set + available_for_purchase.
 * Visibility: access_level + product.visibility_mag_ids (see canViewProduct).
 */
export async function getShopProductList(
  viewer: ShopViewer,
  membershipEnabled: boolean,
  schema?: string
): Promise<ShopProductListItem[]> {
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
    .select("id, title, slug, excerpt, featured_image_id, access_level, updated_at")
    .eq("content_type_id", typeRow.id)
    .eq("status", "published");
  if (contentError || !contentRows?.length) return [];

  const contentList = contentRows as {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featured_image_id: string | null;
    access_level: string | null;
    updated_at: string;
  }[];
  const contentIds = contentList.map((c) => c.id);

  const { data: productRows } = await supabase
    .schema(schemaName)
    .from("product")
    .select("content_id, price, currency, taxable, shippable, visibility_mag_ids")
    .in("content_id", contentIds)
    .not("stripe_product_id", "is", null)
    .eq("available_for_purchase", true);

  const productByContentId = new Map<
    string,
    { price: number; currency: string; taxable: boolean; shippable: boolean; visibility_mag_ids: string[] }
  >();
  for (const p of productRows ?? []) {
    const row = p as Record<string, unknown>;
    const raw = row.visibility_mag_ids;
    const visibility_mag_ids = Array.isArray(raw) ? (raw as unknown[]).map(String) : [];
    productByContentId.set(row.content_id as string, {
      price: Number(row.price),
      currency: (row.currency as string) ?? "USD",
      taxable: Boolean(row.taxable),
      shippable: Boolean(row.shippable),
      visibility_mag_ids,
    });
  }

  const out: ShopProductListItem[] = [];
  for (const c of contentList) {
    const prod = productByContentId.get(c.id);
    if (!prod) continue;
    if (!canViewProduct(c.access_level, prod.visibility_mag_ids, viewer, membershipEnabled)) continue;
    out.push({
      id: c.id,
      slug: c.slug,
      title: c.title,
      excerpt: c.excerpt ?? null,
      featured_image_id: c.featured_image_id ?? null,
      price: prod.price,
      currency: prod.currency,
      taxable: prod.taxable,
      shippable: prod.shippable,
      updated_at: c.updated_at,
    });
  }
  return out.sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1));
}

/**
 * Server-only: get one product by slug for shop detail. Returns null if not found, not eligible, or not visible.
 */
export async function getShopProductBySlug(
  slug: string,
  viewer: ShopViewer,
  membershipEnabled: boolean,
  schema?: string
): Promise<ShopProductDetail | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;

  const { data: typeRow } = await supabase
    .schema(schemaName)
    .from("content_types")
    .select("id")
    .eq("slug", "product")
    .maybeSingle();
  if (!typeRow) return null;

  const { data: content, error: contentError } = await supabase
    .schema(schemaName)
    .from("content")
    .select("id, title, slug, body, excerpt, featured_image_id, status, access_level, updated_at")
    .eq("content_type_id", typeRow.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (contentError || !content) return null;

  const c = content as Record<string, unknown>;
  const contentId = c.id as string;

  const { data: product, error: productError } = await supabase
    .schema(schemaName)
    .from("product")
    .select("*")
    .eq("content_id", contentId)
    .not("stripe_product_id", "is", null)
    .eq("available_for_purchase", true)
    .maybeSingle();
  if (productError || !product) return null;

  const r = product as Record<string, unknown>;
  const rawVisibility = r.visibility_mag_ids;
  const visibility_mag_ids = Array.isArray(rawVisibility)
    ? (rawVisibility as unknown[]).map((x) => String(x))
    : [];
  const accessLevel = (c.access_level as string) ?? null;
  if (!canViewProduct(accessLevel, visibility_mag_ids, viewer, membershipEnabled)) return null;

  return {
    id: contentId,
    slug: c.slug as string,
    title: c.title as string,
    body: (c.body as Record<string, unknown>) ?? null,
    excerpt: (c.excerpt as string) ?? null,
    featured_image_id: (c.featured_image_id as string) ?? null,
    status: (c.status as string) ?? "published",
    access_level: accessLevel,
    price: Number(r.price),
    currency: (r.currency as string) ?? "USD",
    stripe_product_id: (r.stripe_product_id as string) ?? null,
    sku: (r.sku as string) ?? null,
    stock_quantity: r.stock_quantity != null ? Number(r.stock_quantity) : null,
    gallery_id: (r.gallery_id as string) ?? null,
    taxable: Boolean(r.taxable),
    shippable: Boolean(r.shippable),
    updated_at: (c.updated_at as string) ?? "",
  };
}

/**
 * Whether a product is eligible for purchase (shop/catalog and add-to-cart).
 * Eligibility: content published + stripe_product_id set + available_for_purchase.
 */
export function isProductEligibleForPurchase(
  published: boolean,
  stripeProductId: string | null,
  availableForPurchase: boolean
): boolean {
  return Boolean(published && stripeProductId && availableForPurchase);
}

/**
 * Server-only: get one product by slug for shop detail page display.
 * Returns product + eligible flag so the page can show "Not yet available for purchase" or hide add-to-cart.
 * Returns null if content/product not found or viewer cannot see (visibility).
 */
export async function getShopProductBySlugForDisplay(
  slug: string,
  viewer: ShopViewer,
  membershipEnabled: boolean,
  schema?: string
): Promise<{ product: ShopProductDetail; eligible: boolean } | null> {
  const supabase = createServerSupabaseClient();
  const schemaName = schema ?? CONTENT_SCHEMA;

  const { data: typeRow } = await supabase
    .schema(schemaName)
    .from("content_types")
    .select("id")
    .eq("slug", "product")
    .maybeSingle();
  if (!typeRow) return null;

  const { data: content, error: contentError } = await supabase
    .schema(schemaName)
    .from("content")
    .select("id, title, slug, body, excerpt, featured_image_id, status, access_level, updated_at")
    .eq("content_type_id", typeRow.id)
    .eq("slug", slug)
    .maybeSingle();
  if (contentError || !content) return null;

  const c = content as Record<string, unknown>;
  const contentId = c.id as string;

  const { data: product, error: productError } = await supabase
    .schema(schemaName)
    .from("product")
    .select("*")
    .eq("content_id", contentId)
    .maybeSingle();
  if (productError || !product) return null;

  const r = product as Record<string, unknown>;
  const rawVisibility = r.visibility_mag_ids;
  const visibility_mag_ids = Array.isArray(rawVisibility)
    ? (rawVisibility as unknown[]).map((x) => String(x))
    : [];
  const accessLevel = (c.access_level as string) ?? null;
  if (!canViewProduct(accessLevel, visibility_mag_ids, viewer, membershipEnabled)) return null;

  const detail: ShopProductDetail = {
    id: contentId,
    slug: c.slug as string,
    title: c.title as string,
    body: (c.body as Record<string, unknown>) ?? null,
    excerpt: (c.excerpt as string) ?? null,
    featured_image_id: (c.featured_image_id as string) ?? null,
    status: (c.status as string) ?? "published",
    access_level: accessLevel,
    price: Number(r.price),
    currency: (r.currency as string) ?? "USD",
    stripe_product_id: (r.stripe_product_id as string | null) ?? null,
    sku: (r.sku as string | null) ?? null,
    stock_quantity: r.stock_quantity != null ? Number(r.stock_quantity) : null,
    gallery_id: (r.gallery_id as string | null) ?? null,
    taxable: Boolean(r.taxable),
    shippable: Boolean(r.shippable),
    updated_at: (c.updated_at as string) ?? "",
  };

  const eligible = isProductEligibleForPurchase(
    detail.status === "published",
    detail.stripe_product_id,
    Boolean(r.available_for_purchase)
  );

  return { product: detail, eligible };
}

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
  /** Step 25a: Product can be downloadable (digital delivery), or both shippable and downloadable. */
  downloadable: boolean;
  /** Step 25b: Real download URLs (never sent to customer as-is). Array of { label, url }. */
  digital_delivery_links: { label: string; url: string }[];
  available_for_purchase: boolean;
  /** MAG ids that can see this product on the shop (when access_level is mag). Independent of grant-on-purchase. */
  visibility_mag_ids: string[];
  /** Step 17: MAG granted when customer purchases this product (membership product). Null = not a membership product. */
  grant_mag_id: string | null;
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
  const rawLinks = r.digital_delivery_links;
  const digital_delivery_links = parseDigitalDeliveryLinks(rawLinks);
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
    downloadable: Boolean(r.downloadable),
    digital_delivery_links,
    available_for_purchase: Boolean(r.available_for_purchase),
    visibility_mag_ids,
    grant_mag_id: (r.grant_mag_id as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function parseDigitalDeliveryLinks(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
    .map((x) => ({ label: String(x.label ?? "").trim(), url: String(x.url ?? "").trim() }))
    .filter((x) => x.url.length > 0);
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
  downloadable?: boolean;
  digital_delivery_links?: { label: string; url: string }[];
  available_for_purchase?: boolean;
  visibility_mag_ids?: string[];
  grant_mag_id?: string | null;
}): Promise<{ id: string } | null> {
  const supabase = createClientSupabaseClient();
  const links = (row.digital_delivery_links ?? []).filter((l) => (l.url ?? "").trim().length > 0);
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
      downloadable: row.downloadable ?? false,
      digital_delivery_links: links,
      available_for_purchase: row.available_for_purchase ?? true,
      visibility_mag_ids: row.visibility_mag_ids ?? [],
      grant_mag_id: row.grant_mag_id ?? null,
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
 * stripe_product_id is optional (set by Sync to Stripe / Step 11).
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
    downloadable: boolean;
    digital_delivery_links: { label: string; url: string }[];
    available_for_purchase: boolean;
    visibility_mag_ids: string[];
    stripe_product_id: string | null;
    grant_mag_id: string | null;
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
