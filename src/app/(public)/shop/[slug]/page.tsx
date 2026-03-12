/**
 * Public shop product detail. Shows "Not yet available for purchase" or add-to-cart when eligible (Step 12).
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getShopViewer } from "@/lib/shop/viewer";
import { getShopProductBySlugForDisplay } from "@/lib/supabase/products";
import { getMediaById } from "@/lib/supabase/media";
import { getSiteUrl } from "@/lib/supabase/settings";
import { PublicContentRenderer } from "@/components/public/content/PublicContentRenderer";
import { getButtonStyles, getFormStyles, getDesignSystemConfig } from "@/lib/supabase/settings";
interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { viewer, membershipEnabled } = await getShopViewer();
  const result = await getShopProductBySlugForDisplay(slug, viewer, membershipEnabled);
  if (!result) return { title: "Product Not Found" };
  const { product } = result;
  const title = (product.title || "Product").toString();
  const description = (product.excerpt || "").toString().slice(0, 160) || undefined;
  const baseUrl = await getSiteUrl();
  const canonical = baseUrl ? `${baseUrl}/shop/${encodeURIComponent(product.slug)}` : undefined;
  let imageUrl: string | undefined;
  if (product.featured_image_id) {
    try {
      const media = await getMediaById(product.featured_image_id);
      const url = media?.variants?.[0]?.url;
      if (url) {
        imageUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }
    } catch {
      // omit
    }
  }
  return {
    title,
    description,
    ...(canonical && { alternates: { canonical } }),
    openGraph: { title, description, url: canonical, ...(imageUrl && { images: [{ url: imageUrl }] }) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ShopProductPage({ params }: Props) {
  const { slug } = await params;
  const { viewer, membershipEnabled } = await getShopViewer();
  const result = await getShopProductBySlugForDisplay(slug, viewer, membershipEnabled);
  if (!result) notFound();

  const { product, eligible } = result;
  const [buttonStyles, formStyles, config] = await Promise.all([
    getButtonStyles(),
    getFormStyles(),
    getDesignSystemConfig(),
  ]);
  let imageUrl: string | null = null;
  if (product.featured_image_id) {
    try {
      const media = await getMediaById(product.featured_image_id);
      const baseUrl = await getSiteUrl();
      const url = media?.variants?.[0]?.url;
      if (url) {
        imageUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }
    } catch {
      // omit
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/shop" className="text-sm text-muted-foreground hover:underline mb-6 inline-block">
        ← Back to Shop
      </Link>

      <article className="space-y-6">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        {imageUrl && (
          <div className="rounded-lg overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-auto object-cover" />
          </div>
        )}
        {product.excerpt && (
          <p className="text-muted-foreground">{product.excerpt}</p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">
            {product.currency} {Number(product.price).toFixed(2)}
          </span>
        </div>

        {eligible ? (
          <div className="pt-4">
            <AddToCartPlaceholder />
          </div>
        ) : (
          <div className="rounded-md border bg-muted/50 p-4 text-muted-foreground">
            <p className="font-medium">Not yet available for purchase.</p>
            <p className="text-sm mt-1">
              This product is not currently available. Check back later or contact us.
            </p>
          </div>
        )}

        {product.body && Object.keys(product.body).length > 0 && (
          <div className="prose prose-invert max-w-none pt-6 border-t">
            <PublicContentRenderer
              content={product.body as Record<string, unknown>}
              buttonStyles={buttonStyles}
              themeColors={config?.colors ?? null}
              formStyles={formStyles}
            />
          </div>
        )}
      </article>
    </main>
  );
}

/** Placeholder until cart is implemented (Step 13). */
function AddToCartPlaceholder() {
  return (
    <button
      type="button"
      className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
      disabled
      aria-disabled
    >
      Add to cart (coming soon)
    </button>
  );
}
