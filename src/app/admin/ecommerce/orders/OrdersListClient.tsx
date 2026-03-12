"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { OrderRow, OrderStatus } from "@/lib/shop/orders";

const STATUS_OPTIONS: { value: OrderStatus | "all" | "needs_attention"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
];

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function OrdersListClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all" | "needs_attention">("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter as string);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load orders");
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      console.error("fetchOrders:", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const needsAttention = (order: OrderRow) =>
    order.status === "processing" || order.status === "pending";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-2">
          Review orders, search and filter, and fulfill shippable orders. Mark processing orders as completed when done.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All orders</CardTitle>
              <CardDescription>
                Filter by status or search by customer email, order ID, or customer first/last name. Orders in &quot;Processing&quot; need fulfillment attention (e.g. tangible/shippable items).
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchOrders()} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email, order ID, or customer name..."
                  className="pl-8 w-64"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as OrderStatus | "all" | "needs_attention")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p>No orders match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50 hover:bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Order</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Customer</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-right align-middle font-medium">Total</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Attention</th>
                    <th className="h-10 w-[80px] px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        needsAttention(order) ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="p-4 align-middle text-muted-foreground">
                        {order.created_at
                          ? format(new Date(order.created_at), "MMM d, yyyy HH:mm")
                          : "—"}
                      </td>
                      <td className="p-4 align-middle font-mono text-xs">
                        <Link
                          href={`/admin/ecommerce/orders/${order.id}`}
                          className="hover:underline text-primary"
                        >
                          {order.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="p-4 align-middle">{order.customer_email || "—"}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="p-4 align-middle">
                        {needsAttention(order) ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            Needs attention
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/ecommerce/orders/${order.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
