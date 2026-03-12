/**
 * Step 18/20: Checkout success — thank-you page after Stripe redirect.
 * Webhook marks order paid and sets completed/processing; this page clears the cart.
 */

import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order confirmed",
  description: "Thank you for your order",
};

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessClient />;
}
