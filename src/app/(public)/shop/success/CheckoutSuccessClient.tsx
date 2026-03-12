"use client";

/**
 * Clears the cart on mount (after successful checkout) and notifies header to update badge.
 */

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CheckoutSuccessClient() {
  useEffect(() => {
    fetch("/api/shop/cart", { method: "DELETE", credentials: "include" })
      .then(() => {
        window.dispatchEvent(new CustomEvent("cart-updated"));
      })
      .catch(() => {});
  }, []);

  return (
    <main className="container mx-auto px-4 py-16 max-w-xl text-center">
      <h1 className="text-2xl font-bold mb-4">Thank you for your order</h1>
      <p className="text-muted-foreground mb-6">
        Your payment was successful. You will receive an order confirmation by email. You can also view your order history in your account.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Button asChild>
          <Link href="/members/orders">View order history</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-6">
        Guest? <Link href="/shop/order-lookup" className="text-primary hover:underline">Look up your order</Link> with your email and order ID from the confirmation email.
      </p>
    </main>
  );
}
