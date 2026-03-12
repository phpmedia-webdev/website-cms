"use client";

/**
 * Add to cart button for product detail page. Calls POST /api/shop/cart/items.
 */

import { useState } from "react";
import Link from "next/link";

interface AddToCartButtonProps {
  contentId: string;
  quantity?: number;
  className?: string;
  onAdded?: () => void;
}

export function AddToCartButton({
  contentId,
  quantity = 1,
  className = "",
  onAdded,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content_id: contentId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add to cart");
        return;
      }
      setAdded(true);
      onAdded?.();
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      setError("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  }

  if (added) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm text-green-600 dark:text-green-400">Added to cart</span>
        <Link
          href="/shop/cart"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90 inline-block text-center"
        >
          View cart
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading}
        className={
          className ||
          "rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
        }
      >
        {loading ? "Adding…" : "Add to cart"}
      </button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
