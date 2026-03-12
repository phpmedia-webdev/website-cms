"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Package } from "lucide-react";
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

interface OrderDetailClientProps {
  orderId: string;
}

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ecommerce/orders/${orderId}`);
        if (!res.ok) {
          if (res.status === 404) setOrder(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setOrder(data.order ?? null);
          setItems(data.items ?? []);
        }
      } catch (e) {
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const handleMarkCompleted = async () => {
    if (!order || order.status !== "processing") return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/ecommerce/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setOrder((prev) => (prev ? { ...prev, status: "completed" } : null));
        router.refresh();
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/ecommerce/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to orders
          </Link>
        </Button>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const canMarkCompleted = order.status === "processing";
  const hasShippable = items.some((i) => i.shippable);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/ecommerce/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to orders
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Order {order.id.slice(0, 8)}…</h1>
          <Badge variant={order.status === "completed" ? "default" : "secondary"}>
            {order.status}
          </Badge>
        </div>
        {canMarkCompleted && (
          <Button onClick={handleMarkCompleted} disabled={updating}>
            {updating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Mark as completed
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>Contact and addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div>{order.customer_email}</div>
            </div>
            <AddressBlock title="Billing" snapshot={order.billing_snapshot} />
            <AddressBlock title="Shipping" snapshot={order.shipping_snapshot} />
            {order.coupon_code && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Coupon</div>
                <div>{order.coupon_code}</div>
                {order.discount_amount > 0 && (
                  <div className="text-sm">Discount: {formatCurrency(order.discount_amount, order.currency)}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Dates and payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{order.created_at ? format(new Date(order.created_at), "PPp") : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              <span>{order.updated_at ? format(new Date(order.updated_at), "PPp") : "—"}</span>
            </div>
            {order.stripe_checkout_session_id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stripe session</span>
                <span className="font-mono text-xs truncate max-w-[180px]" title={order.stripe_checkout_session_id}>
                  {order.stripe_checkout_session_id.slice(0, 20)}…
                </span>
              </div>
            )}
            <div className="pt-2 border-t font-medium">
              Total: {formatCurrency(order.total, order.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {hasShippable ? "Some items are shippable; fulfill and then mark order completed." : "Order items."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/50">
                  <th className="h-10 px-4 text-left align-middle font-medium">Product</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">Qty</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">Unit price</th>
                  <th className="h-10 px-4 text-right align-middle font-medium">Line total</th>
                  <th className="h-10 px-4 text-left align-middle font-medium">Shippable</th>
                  <th className="h-10 px-4 text-left align-middle font-medium">Downloadable</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-4 align-middle">{item.name_snapshot}</td>
                    <td className="p-4 align-middle text-right">{item.quantity}</td>
                    <td className="p-4 align-middle text-right">
                      {formatCurrency(item.unit_price, order.currency)}
                    </td>
                    <td className="p-4 align-middle text-right">
                      {formatCurrency(item.line_total, order.currency)}
                    </td>
                    <td className="p-4 align-middle">{item.shippable ? "Yes" : "No"}</td>
                                        <td className="p-4 align-middle">{item.downloadable ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
