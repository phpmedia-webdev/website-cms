"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, ChevronDown, Download, Upload, CreditCard, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import type { OrderRow } from "@/lib/shop/orders";
import type { InvoiceRow } from "@/lib/shop/invoices";
import { StripeSyncOrdersCard } from "../orders/StripeSyncOrdersCard";
import { WooSyncCard } from "../orders/WooSyncCard";

type TransactionTypeFilter = "all" | "order" | "invoice";
type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

interface MergedTransaction {
  kind: "order" | "invoice";
  id: string;
  date: string;
  typeLabel: string;
  customer: string;
  reference: string | null;
  amount: number;
  currency: string;
  status: string;
  href: string;
  order?: OrderRow;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function orderTypeLabel(order: OrderRow): string {
  if (order.stripe_checkout_session_id) return "Checkout";
  if (order.stripe_invoice_id) return "Subscription";
  return "Order";
}

export function TransactionsPageClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("date-desc");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const [wooDialogOpen, setWooDialogOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, invoicesRes] = await Promise.all([
        fetch("/api/ecommerce/orders?limit=500"),
        fetch("/api/ecommerce/invoices?limit=500"),
      ]);
      const ordersData = ordersRes.ok ? (await ordersRes.json()).orders ?? [] : [];
      const invoicesData = invoicesRes.ok ? (await invoicesRes.json()).invoices ?? [] : [];
      setOrders(ordersData);
      setInvoices(invoicesData);
    } catch (e) {
      console.error("fetchData:", e);
      setOrders([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const merged: MergedTransaction[] = [
    ...orders.map((o) => ({
      kind: "order" as const,
      id: o.id,
      date: o.created_at,
      typeLabel: orderTypeLabel(o),
      customer: o.customer_email,
      reference: o.order_number ?? null,
      amount: o.total,
      currency: o.currency,
      status: o.status,
      href: `/admin/ecommerce/orders/${o.id}`,
      order: o,
    })),
    ...invoices.map((i) => ({
      kind: "invoice" as const,
      id: i.id,
      date: i.created_at,
      typeLabel: "Invoice",
      customer: i.customer_email,
      reference: i.invoice_number,
      amount: i.total,
      currency: i.currency,
      status: i.status,
      href: `/admin/ecommerce/invoices/${i.id}`,
    })),
  ];

  const filteredByType =
    typeFilter === "all"
      ? merged
      : typeFilter === "order"
        ? merged.filter((m) => m.kind === "order")
        : merged.filter((m) => m.kind === "invoice");

  const filteredByStatus =
    statusFilter === "all"
      ? filteredByType
      : filteredByType.filter((m) => m.status === statusFilter);

  const filteredByDate = (() => {
    if (!dateFrom && !dateTo) return filteredByStatus;
    return filteredByStatus.filter((m) => {
      const d = new Date(m.date).getTime();
      if (dateFrom && d < new Date(dateFrom + "T00:00:00").getTime()) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59").getTime()) return false;
      return true;
    });
  })();

  const sorted = [...filteredByDate].sort((a, b) => {
    if (sort === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sort === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === "amount-desc") return b.amount - a.amount;
    if (sort === "amount-asc") return a.amount - b.amount;
    return 0;
  });

  const statusOptions =
    typeFilter === "invoice"
      ? [
          { value: "all", label: "Any status" },
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "open", label: "Open" },
          { value: "paid", label: "Paid" },
        ]
      : typeFilter === "order"
        ? [
            { value: "all", label: "Any status" },
            { value: "pending", label: "Pending" },
            { value: "paid", label: "Paid" },
            { value: "processing", label: "Processing" },
            { value: "completed", label: "Completed" },
          ]
        : [{ value: "all", label: "Any status" }];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Orders and invoices in one list. Filter by type, date, and status; sort by date or amount.
          </p>
        </div>
        <div className="relative" ref={actionsRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActionsOpen((o) => !o)}
            className="gap-1.5"
          >
            Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
          {actionsOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-md border bg-popover text-popover-foreground py-1 shadow-md">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  setActionsOpen(false);
                  setStripeDialogOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4" />
                Sync with Stripe
              </button>
              <a
                href="/api/ecommerce/export/orders?format=csv"
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setActionsOpen(false)}
              >
                <Download className="h-4 w-4" />
                Export for accounting (CSV)
              </a>
              <Link
                href="/admin/ecommerce/orders/import"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setActionsOpen(false)}
              >
                <Upload className="h-4 w-4" />
                Import orders (CSV)
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  setActionsOpen(false);
                  setWooDialogOpen(true);
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                Import from WooCommerce
              </button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v as TransactionTypeFilter);
                  setStatusFilter("all");
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (newest first)</SelectItem>
                  <SelectItem value="date-asc">Date (oldest first)</SelectItem>
                  <SelectItem value="amount-desc">Amount (high to low)</SelectItem>
                  <SelectItem value="amount-asc">Amount (low to high)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No transactions match. Try relaxing filters or add data.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-9 px-4 text-left font-medium">Date</th>
                    <th className="h-9 px-4 text-left font-medium">Type</th>
                    <th className="h-9 px-4 text-left font-medium">Customer</th>
                    <th className="h-9 px-4 text-left font-medium">Reference</th>
                    <th className="h-9 px-4 text-right font-medium">Amount</th>
                    <th className="h-9 px-4 text-left font-medium">Status</th>
                    <th className="h-9 w-28 px-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <TransactionRow key={`${row.kind}-${row.id}`} row={row} onUpdated={fetchData} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={stripeDialogOpen} onOpenChange={setStripeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync with Stripe</DialogTitle>
          </DialogHeader>
          <StripeSyncOrdersCard />
        </DialogContent>
      </Dialog>
      <Dialog open={wooDialogOpen} onOpenChange={setWooDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from WooCommerce</DialogTitle>
          </DialogHeader>
          <WooSyncCard />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionRow({
  row,
  onUpdated,
}: {
  row: MergedTransaction;
  onUpdated: () => void;
}) {
  const [completing, setCompleting] = useState(false);
  const canMarkComplete = row.kind === "order" && row.order?.status === "processing";

  const handleMarkComplete = async () => {
    if (row.kind !== "order" || row.order?.status !== "processing") return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/ecommerce/orders/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) onUpdated();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3 text-muted-foreground">
        {format(new Date(row.date), "MMM d, yyyy")}
      </td>
      <td className="p-3 capitalize">{row.typeLabel}</td>
      <td className="p-3">{row.customer}</td>
      <td className="p-3 font-mono text-xs">{row.reference ?? "—"}</td>
      <td className="p-3 text-right">
        {formatCurrency(row.amount, row.currency)}
      </td>
      <td className="p-3 capitalize">{row.status}</td>
      <td className="p-3 flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
          <Link href={row.href}>View</Link>
        </Button>
        {canMarkComplete && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={handleMarkComplete}
            disabled={completing}
          >
            {completing ? "…" : "Mark complete"}
          </Button>
        )}
      </td>
    </tr>
  );
}
