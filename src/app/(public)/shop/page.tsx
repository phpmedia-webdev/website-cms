/**
 * Public shop catalog. Lists only products eligible for purchase (published + stripe_product_id + available_for_purchase).
 */

import Link from "next/link";
import { getShopViewer } from "@/lib/shop/viewer";
import { getShopProductList } from "@/lib/supabase/products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop",
  description: "Browse products",
};

export default async function ShopPage() {
  let products: Awaited<ReturnType<typeof getShopProductList>> = [];
  try {
    const { viewer, membershipEnabled } = await getShopViewer();
    products = await getShopProductList(viewer, membershipEnabled);
  } catch (err) {
    if (process.env.NODE_ENV === "development" && err instanceof Error) {
      console.warn("Shop page: getShopViewer/getShopProductList failed", err.message);
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shop</h1>
      {products.length === 0 ? (
        <div className="text-muted-foreground space-y-2">
          <p>No products available at the moment.</p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-sm">
              To show here, each product must be: <strong>published</strong>,{" "}
              <strong>synced to Stripe</strong> (Create Stripe Product / Sync in admin), and{" "}
              <strong>Available for purchase</strong> checked.
            </p>
          )}
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-lg border p-4 hover:bg-muted/30">
              <Link href={`/shop/${encodeURIComponent(p.slug)}`} className="block">
                <h2 className="font-semibold text-lg">{p.title}</h2>
                {p.excerpt && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>
                )}
                <p className="mt-2 font-medium">
                  {p.currency} {Number(p.price).toFixed(2)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
