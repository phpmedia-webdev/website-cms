"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { OrderRow } from "@/lib/shop/orders";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function MembersOrdersListClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members/orders");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOrders(data.orders ?? []);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading your orders…</div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
          <CardDescription>You have no orders yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            When you place an order, it will appear here with its status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order history</CardTitle>
        <CardDescription>View status and details of your orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <div className="font-medium">
                  <Link
                    href={`/members/orders/${order.id}`}
                    className="text-primary hover:underline"
                  >
                    Order {order.id.slice(0, 8)}…
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.created_at
                    ? format(new Date(order.created_at), "MMM d, yyyy")
                    : "—"}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                  {order.status}
                </Badge>
                <span className="font-medium">
                  {formatCurrency(order.total, order.currency)}
                </span>
                <Link
                  href={`/members/orders/${order.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
