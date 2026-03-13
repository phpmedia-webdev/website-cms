"use client";

/**
 * Step 18: Checkout form — email, billing, optional shipping (if cart has shippable).
 * Submits to POST /api/shop/checkout, redirects to Stripe on success.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

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
  has_shippable?: boolean;
  has_recurring?: boolean;
  has_onetime?: boolean;
}

const emptyCart: CartData = {
  session_id: null,
  currency: "USD",
  items: [],
  item_count: 0,
  subtotal: 0,
  has_shippable: false,
};

type AddressForm = {
  name: string;
  address: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const emptyAddress: AddressForm = {
  name: "",
  address: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
}

export function CheckoutPageClient() {
  const [cart, setCart] = useState<CartData>(emptyCart);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<AddressForm>(emptyAddress);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [shipping, setShipping] = useState<AddressForm>(emptyAddress);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    coupon_code: string;
    discount_amount: number;
    coupon_batch_id: string;
  } | null>(null);
  const [applyCodeLoading, setApplyCodeLoading] = useState(false);
  const [applyCodeError, setApplyCodeError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shop/cart", { credentials: "include" })
      .then((r) => r.json())
      .then((data: CartData) => {
        setCart({
          session_id: data.session_id ?? null,
          currency: data.currency ?? "USD",
          items: data.items ?? [],
          item_count: data.item_count ?? 0,
          subtotal: data.subtotal ?? 0,
          has_shippable: data.has_shippable ?? false,
          has_recurring: data.has_recurring ?? false,
          has_onetime: data.has_onetime ?? false,
        });
      })
      .catch(() => setCart(emptyCart))
      .finally(() => setLoading(false));
  }, []);

  const updateBilling = (field: keyof AddressForm, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
    if (sameAsBilling) setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const updateShipping = (field: keyof AddressForm, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const handleSameAsBillingChange = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) setShipping({ ...billing });
  };

  const handleApplyCode = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyCodeError(null);
    setApplyCodeLoading(true);
    try {
      const res = await fetch("/api/shop/checkout/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.valid && data.discount_amount != null && data.coupon_code && data.coupon_batch_id) {
        setAppliedCoupon({
          coupon_code: data.coupon_code,
          discount_amount: data.discount_amount,
          coupon_batch_id: data.coupon_batch_id,
        });
        setCouponInput("");
      } else {
        setApplyCodeError(data.error ?? "Invalid code");
        setAppliedCoupon(null);
      }
    } catch {
      setApplyCodeError("Could not validate code.");
      setAppliedCoupon(null);
    } finally {
      setApplyCodeLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setApplyCodeError(null);
  };

  const toSnapshot = (a: AddressForm) => ({
    name: a.name || undefined,
    address: a.address || undefined,
    address_line2: a.address_line2 || undefined,
    city: a.city || undefined,
    state: a.state || undefined,
    postal_code: a.postal_code || undefined,
    country: a.country || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_email: email.trim(),
          billing_snapshot: toSnapshot(billing),
          shipping_snapshot: cart.has_shippable
            ? sameAsBilling
              ? toSnapshot(billing)
              : toSnapshot(shipping)
            : undefined,
          ...(appliedCoupon && {
            coupon_code: appliedCoupon.coupon_code,
            coupon_batch_id: appliedCoupon.coupon_batch_id,
            discount_amount: appliedCoupon.discount_amount,
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in required to checkout. Use the link below to sign in and try again.");
          return;
        }
        setError(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No redirect URL received.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!cart.session_id || cart.items.length === 0) {
    return (
      <main className="container mx-auto px-4 py-16 max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p className="text-muted-foreground mb-6">Your cart is empty. Add items before checkout.</p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/shop/cart">View cart</Link>
          </Button>
          <Button asChild>
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (cart.has_recurring && cart.has_onetime) {
    return (
      <main className="container mx-auto px-4 py-16 max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p className="text-muted-foreground mb-6">
          One-time purchases cannot be mixed with subscriptions. Please complete one type of purchase first, then start a new transaction for the other.
        </p>
        <Button asChild variant="outline">
          <Link href="/shop/cart">Back to cart</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Checkout</h1>
      <p className="text-muted-foreground mb-6">
        Enter your details below. You will be redirected to Stripe to complete payment.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>We will use this for order confirmation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billing-name">Full name</Label>
                <Input
                  id="billing-name"
                  value={billing.name}
                  onChange={(e) => updateBilling("name", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billing-address">Address</Label>
                <Input
                  id="billing-address"
                  value={billing.address}
                  onChange={(e) => updateBilling("address", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billing-address2">Address line 2 (optional)</Label>
                <Input
                  id="billing-address2"
                  value={billing.address_line2}
                  onChange={(e) => updateBilling("address_line2", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-city">City</Label>
                <Input
                  id="billing-city"
                  value={billing.city}
                  onChange={(e) => updateBilling("city", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-state">State / Province</Label>
                <Input
                  id="billing-state"
                  value={billing.state}
                  onChange={(e) => updateBilling("state", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-postal">Postal code</Label>
                <Input
                  id="billing-postal"
                  value={billing.postal_code}
                  onChange={(e) => updateBilling("postal_code", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-country">Country</Label>
                <Input
                  id="billing-country"
                  value={billing.country}
                  onChange={(e) => updateBilling("country", e.target.value)}
                  placeholder="e.g. US"
                  disabled={submitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {cart.has_shippable && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="same-as-billing"
                  checked={sameAsBilling}
                  onCheckedChange={(c) => handleSameAsBillingChange(!!c)}
                  disabled={submitting}
                />
                <Label htmlFor="same-as-billing" className="cursor-pointer">Shipping same as billing</Label>
              </div>
            </CardHeader>
            {!sameAsBilling && (
              <CardContent className="space-y-4 pt-0">
                <CardTitle className="text-base">Shipping address</CardTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ship-name">Full name</Label>
                    <Input
                      id="ship-name"
                      value={shipping.name}
                      onChange={(e) => updateShipping("name", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ship-address">Address</Label>
                    <Input
                      id="ship-address"
                      value={shipping.address}
                      onChange={(e) => updateShipping("address", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ship-address2">Address line 2 (optional)</Label>
                    <Input
                      id="ship-address2"
                      value={shipping.address_line2}
                      onChange={(e) => updateShipping("address_line2", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-city">City</Label>
                    <Input id="ship-city" value={shipping.city} onChange={(e) => updateShipping("city", e.target.value)} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-state">State / Province</Label>
                    <Input id="ship-state" value={shipping.state} onChange={(e) => updateShipping("state", e.target.value)} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-postal">Postal code</Label>
                    <Input id="ship-postal" value={shipping.postal_code} onChange={(e) => updateShipping("postal_code", e.target.value)} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ship-country">Country</Label>
                    <Input id="ship-country" value={shipping.country} onChange={(e) => updateShipping("country", e.target.value)} disabled={submitting} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Discount code</CardTitle>
            <CardDescription>Enter a code to apply a discount.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span>
                  <strong>{appliedCoupon.coupon_code}</strong> applied: −{formatCurrency(appliedCoupon.discount_amount, cart.currency)}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={removeCoupon} disabled={submitting}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setApplyCodeError(null);
                  }}
                  placeholder="Enter code"
                  disabled={submitting || applyCodeLoading}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCode())}
                />
                <Button type="button" variant="outline" onClick={handleApplyCode} disabled={!couponInput.trim() || applyCodeLoading || submitting}>
                  {applyCodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {applyCodeError && <p className="text-sm text-destructive">{applyCodeError}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>{cart.item_count} item(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {cart.items.map((item) => (
                <li key={item.content_id} className="flex justify-between">
                  <span>{item.title || "Item"} × {item.quantity}</span>
                  <span>{formatCurrency(item.line_total, cart.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal, cart.currency)}</span>
            </p>
            {appliedCoupon && (
              <p className="flex justify-between text-sm text-muted-foreground">
                <span>Discount ({appliedCoupon.coupon_code})</span>
                <span>−{formatCurrency(appliedCoupon.discount_amount, cart.currency)}</span>
              </p>
            )}
            <p className="mt-2 font-medium flex justify-between">
              <span>Total</span>
              <span>{formatCurrency(cart.subtotal - (appliedCoupon?.discount_amount ?? 0), cart.currency)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Payment is handled securely by Stripe. You will be redirected to complete payment.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-2">
            <p>{error}</p>
            {error.includes("Sign in required") && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/login?redirect=${encodeURIComponent("/shop/checkout")}`}>
                  Sign in to checkout
                </Link>
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting to payment…
              </>
            ) : (
              "Continue to payment"
            )}
          </Button>
          <Button type="button" variant="outline" asChild disabled={submitting}>
            <Link href="/shop/cart">Back to cart</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
