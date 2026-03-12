/**
 * Step 25e: Build time-limited download links for an order (for order detail and email).
 */

import { getOrderItems } from "@/lib/shop/orders";
import { getSiteUrl } from "@/lib/supabase/settings";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { generateDownloadToken } from "./download-token";

const CONTENT_SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface OrderDownloadLink {
  orderItemId: string;
  itemName: string;
  label: string;
  url: string;
}

/**
 * Returns time-limited download links for all downloadable items in an order.
 * Call only for orders that are paid/completed/processing; caller should validate.
 */
export async function getOrderDownloadLinks(
  orderId: string,
  schema?: string
): Promise<OrderDownloadLink[]> {
  const schemaName = schema ?? CONTENT_SCHEMA;
  const items = await getOrderItems(orderId, schemaName);
  const downloadableItems = items.filter((i) => i.downloadable);
  if (downloadableItems.length === 0) return [];

  const supabase = createServerSupabaseClient();
  const contentIds = [...new Set(downloadableItems.map((i) => i.content_id))];
  const { data: productRows } = await supabase
    .schema(schemaName)
    .from("product")
    .select("content_id, digital_delivery_links")
    .in("content_id", contentIds);

  const linksByContentId = new Map<string, { label: string; url: string }[]>();
  for (const row of productRows ?? []) {
    const r = row as { content_id: string; digital_delivery_links?: unknown };
    const raw = r.digital_delivery_links;
    const arr = Array.isArray(raw)
      ? raw
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((x) => ({ label: String(x.label ?? "").trim(), url: String(x.url ?? "").trim() }))
          .filter((x) => x.url.length > 0)
      : [];
    linksByContentId.set(r.content_id, arr);
  }

  const baseUrl = (await getSiteUrl()).replace(/\/$/, "") || "";
  const out: OrderDownloadLink[] = [];

  for (const item of downloadableItems) {
    const productLinks = linksByContentId.get(item.content_id) ?? [];
    for (let linkIndex = 0; linkIndex < productLinks.length; linkIndex++) {
      const link = productLinks[linkIndex];
      const token = generateDownloadToken(orderId, item.id, linkIndex);
      const url = baseUrl ? `${baseUrl}/api/shop/download?token=${encodeURIComponent(token)}` : `/api/shop/download?token=${encodeURIComponent(token)}`;
      out.push({
        orderItemId: item.id,
        itemName: item.name_snapshot,
        label: link.label || "Download",
        url,
      });
    }
  }

  return out;
}
