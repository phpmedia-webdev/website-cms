"use client";

/**
 * Cart icon for public header with item count badge. Shown when cart has items.
 * Links to /shop/cart. Fetches count from GET /api/shop/cart/count.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export function PublicHeaderCartIcon() {
  const [count, setCount] = useState<number | null>(null);

  async function fetchCount() {
    try {
      const res = await fetch("/api/shop/cart/count", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (typeof data.count === "number") {
        setCount(data.count);
      } else {
        setCount(0);
      }
    } catch {
      setCount(0);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchCount();
      if (cancelled) return;
    })();
    const onCartUpdated = () => {
      if (!cancelled) fetchCount();
    };
    window.addEventListener("cart-updated", onCartUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("cart-updated", onCartUpdated);
    };
  }, []);

  // Don't render icon at all when we haven't loaded yet (avoids layout shift)
  if (count === null) return null;
  // Hide when empty so we don't show an empty cart icon
  if (count === 0) return null;

  return (
    <Link
      href="/shop/cart"
      className="relative inline-flex items-center justify-center p-1 rounded hover:bg-muted/50 text-current"
      aria-label={`Cart: ${count} item${count !== 1 ? "s" : ""}`}
    >
      <ShoppingCart className="h-5 w-5" />
      <span
        className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium"
        aria-hidden
      >
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
