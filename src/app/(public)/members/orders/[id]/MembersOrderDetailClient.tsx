"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface MembersOrderDetailClientProps {
  orderId: string;
}

interface DownloadLink {
  orderItemId: string;
  itemName: string;
  label: string;
  url: string;
}

export function MembersOrderDetailClient({ orderId }: MembersOrderDetailClientProps) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/members/orders/${orderId}`);
        if (!res.ok) {
          if (!cancelled) setOrder(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setOrder(data.order ?? null);
          setItems(data.items ?? []);
          setDownloadLinks(data.download_links ?? []);
        }
      } catch {
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading order…</div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Order not found or you don’t have access to it.</p>
        <Link href="/members/orders" className="text-primary hover:underline text-sm">
          ← Back to Order history
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">Order {order.id.slice(0, 8)}…</h1>
        <Badge variant={order.status === "completed" ? "default" : "secondary"}>
          {order.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
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
          <CardTitle>Addresses</CardTitle>
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
          <CardTitle>Items</CardTitle>
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
            <CardTitle>Downloads</CardTitle>
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

      <p className="text-sm text-muted-foreground">
        <Link href="/members/orders" className="text-primary hover:underline">
          ← Back to Order history
        </Link>
      </p>
    </div>
  );
}
