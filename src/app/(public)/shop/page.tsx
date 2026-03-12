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
  const { viewer, membershipEnabled } = await getShopViewer();
  const products = await getShopProductList(viewer, membershipEnabled);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shop</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">No products available at the moment.</p>
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
