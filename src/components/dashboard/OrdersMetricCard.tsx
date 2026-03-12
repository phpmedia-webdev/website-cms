"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import type { OrderMetrics } from "@/lib/shop/orders";

interface OrdersMetricCardProps {
  /** Step 26: Real metrics from getOrderMetrics; omit for placeholder when ecommerce not used. */
  metrics?: OrderMetrics | null;
}

export function OrdersMetricCard({ metrics }: OrdersMetricCardProps) {
  const hasMetrics = metrics && (metrics.todayCount > 0 || metrics.pending > 0 || metrics.processing > 0 || metrics.completed > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
        <CardTitle className="text-sm font-medium">Orders</CardTitle>
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {hasMetrics ? (
          <>
            <div className="text-xl font-bold">{metrics!.todayCount} today</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[
                metrics!.pending + metrics!.processing > 0 && `${metrics!.pending + metrics!.processing} need attention`,
                metrics!.completed > 0 && `${metrics!.completed} completed`,
                metrics!.revenueCompleted > 0 && `$${Number(metrics!.revenueCompleted).toLocaleString("en-US", { minimumFractionDigits: 2 })} revenue`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Link
              href="/admin/ecommerce/orders"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View orders →
            </Link>
          </>
        ) : (
          <>
            <div className="text-xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              No orders yet
            </p>
            <Link
              href="/admin/ecommerce/orders"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              Orders →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
