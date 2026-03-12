/**
 * Step 18: Checkout — form (email, billing, shipping if shippable) then redirect to Stripe.
 */

import { CheckoutPageClient } from "./CheckoutPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
  description: "Complete your purchase",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
