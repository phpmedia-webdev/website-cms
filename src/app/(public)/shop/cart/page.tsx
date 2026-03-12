/**
 * Public cart page (Step 13b). Displays cart items, update/remove, subtotal, link to checkout.
 */

import Link from "next/link";
import { CartPageClient } from "./CartPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cart",
  description: "Your shopping cart",
};

export default function CartPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/shop"
        className="text-sm text-muted-foreground hover:underline mb-6 inline-block"
      >
        ← Back to Shop
      </Link>
      <CartPageClient />
    </main>
  );
}
