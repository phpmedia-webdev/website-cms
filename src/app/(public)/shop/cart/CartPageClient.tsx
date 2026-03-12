"use client";

/**
 * Cart page client: fetches cart from API, lists items with update/remove, subtotal, link to checkout (placeholder).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface CartItem {
  content_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  title?: string;
  slug?: string;
}

interface CartData {
  session_id: string | null;
  currency: string;
  items: CartItem[];
  item_count: number;
  subtotal: number;
}

const emptyCart: CartData = {
  session_id: null,
  currency: "USD",
  items: [],
  item_count: 0,
  subtotal: 0,
};

export function CartPageClient() {
  const [cart, setCart] = useState<CartData>(emptyCart);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadCart() {
    try {
      const res = await fetch("/api/shop/cart", { credentials: "include" });
      const data = await res.json();
      setCart({
        session_id: data.session_id ?? null,
        currency: data.currency ?? "USD",
        items: data.items ?? [],
        item_count: data.item_count ?? 0,
        subtotal: data.subtotal ?? 0,
      });
    } catch {
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQty(contentId: string, quantity: number) {
    if (quantity < 1) return;
    setUpdating(contentId);
    try {
      const res = await fetch("/api/shop/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content_id: contentId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart({
          session_id: data.session_id ?? cart.session_id,
          currency: data.currency ?? cart.currency,
          items: data.items ?? [],
          item_count: data.item_count ?? 0,
          subtotal: data.subtotal ?? 0,
        });
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function removeItem(contentId: string) {
    setUpdating(contentId);
    try {
      const res = await fetch("/api/shop/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content_id: contentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCart({
          session_id: data.session_id ?? cart.session_id,
          currency: data.currency ?? cart.currency,
          items: data.items ?? [],
          item_count: data.item_count ?? 0,
          subtotal: data.subtotal ?? 0,
        });
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading cart…
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Cart</h1>
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link
          href="/shop"
          className="inline-block text-primary hover:underline font-medium"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cart</h1>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Quantity</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 w-20" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => (
              <tr key={item.content_id} className="border-b last:border-b-0">
                <td className="p-3">
                  {item.slug ? (
                    <Link
                      href={`/shop/${encodeURIComponent(item.slug)}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {item.title || "Product"}
                    </Link>
                  ) : (
                    <span className="font-medium">{item.title || "Product"}</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {cart.currency} {Number(item.unit_price).toFixed(2)}
                </td>
                <td className="p-3">
                  <select
                    value={item.quantity}
                    onChange={(e) =>
                      updateQty(item.content_id, parseInt(e.target.value, 10))
                    }
                    disabled={updating === item.content_id}
                    className="rounded border bg-background px-2 py-1 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 font-medium">
                  {cart.currency} {Number(item.line_total).toFixed(2)}
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => removeItem(item.content_id)}
                    disabled={updating === item.content_id}
                    className="text-muted-foreground hover:text-foreground text-sm underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-lg font-semibold">
          Subtotal: {cart.currency} {Number(cart.subtotal).toFixed(2)}
        </p>
        <div className="flex gap-3">
          <Link
            href="/shop"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Continue shopping
          </Link>
          <Link
            href="/shop/checkout"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Proceed to checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
