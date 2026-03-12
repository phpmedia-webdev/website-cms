"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import type { OrderRow, OrderItemRow, AddressSnapshot } from "@/lib/shop/orders";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function AddressBlock({
  title,
  snapshot,
}: {
  title: string;
  snapshot: AddressSnapshot | Record<string, unknown> | null | undefined;
}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const a = snapshot as AddressSnapshot;
  const line1 = [a.address, a.address_line2].filter(Boolean).join(", ");
  const line2 = [a.city, a.state, a.postal_code].filter(Boolean).join(", ");
  const country = a.country;
  if (!line1 && !line2 && !country && !a.name) return null;
  return (
    <div className="text-sm">
      <div className="font-medium text-muted-foreground mb-1">{title}</div>
      {a.name && <div>{a.name}</div>}
      {line1 && <div>{line1}</div>}
      {line2 && <div>{line2}</div>}
      {country && <div>{country}</div>}
    </div>
  );
}

interface DownloadLink {
  orderItemId: string;
  itemName: string;
  label: string;
  url: string;
}

function OrderDetail({
  order,
  items,
  downloadLinks = [],
}: {
  order: OrderRow;
  items: OrderItemRow[];
  downloadLinks?: DownloadLink[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-semibold">Order {order.id.slice(0, 8)}…</h2>
        <Badge variant={order.status === "completed" ? "default" : "secondary"}>
          {order.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>Date and total</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Placed</span>
            <span>{order.created_at ? format(new Date(order.created_at), "PPp") : "—"}</span>
          </div>
          <div className="pt-2 border-t font-medium">
            Total: {formatCurrency(order.total, order.currency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Addresses</CardTitle>
          <CardDescription>Billing and shipping</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressBlock title="Billing" snapshot={order.billing_snapshot} />
          <AddressBlock title="Shipping" snapshot={order.shipping_snapshot} />
          {!order.billing_snapshot && !order.shipping_snapshot && (
            <p className="text-sm text-muted-foreground">No address on file for this order.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
              >
                <span>{item.name_snapshot} × {item.quantity}</span>
                <span>{formatCurrency(item.line_total, order.currency)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {downloadLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Downloads</CardTitle>
            <CardDescription>Time-limited links; use before they expire.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {downloadLinks.map((link, idx) => (
                <li key={`${link.orderItemId}-${idx}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    {link.label}
                    {link.itemName ? ` (${link.itemName})` : ""}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function GuestOrderLookupClient() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    order: OrderRow;
    items: OrderItemRow[];
    download_links?: { orderItemId: string; itemName: string; label: string; url: string }[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eTrim = email.trim();
    const idTrim = orderId.trim();
    if (!eTrim || !idTrim) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const res = await fetch(
        `/api/shop/order-lookup?email=${encodeURIComponent(eTrim)}&order_id=${encodeURIComponent(idTrim)}`
      );
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setResult({
        order: data.order,
        items: data.items ?? [],
        download_links: data.download_links ?? [],
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Look up your order</h1>
        <p className="text-muted-foreground mt-1">
          Enter the email address and order ID from your confirmation email to view order status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order lookup</CardTitle>
          <CardDescription>Email and Order ID are required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-order-id">Order ID</Label>
              <Input
                id="guest-order-id"
                type="text"
                placeholder="Order ID from confirmation email"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Looking up…" : "View order"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {notFound && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Order not found. Check that the email and Order ID are correct. The Order ID is in your confirmation email.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <OrderDetail
          order={result.order}
          items={result.items}
          downloadLinks={result.download_links}
        />
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/shop" className="text-primary hover:underline">
          ← Back to shop
        </Link>
      </p>
    </div>
  );
}
