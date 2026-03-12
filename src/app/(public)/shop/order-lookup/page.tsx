import { GuestOrderLookupClient } from "./GuestOrderLookupClient";

/**
 * Step 24: Guest order lookup — view order status by email + order ID (no login).
 */
export default function ShopOrderLookupPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <GuestOrderLookupClient />
    </main>
  );
}
