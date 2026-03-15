"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { OrderRow } from "@/lib/shop/orders";
import type { InvoiceRow } from "@/lib/shop/invoices";

type TransactionTypeFilter = "all" | "order" | "invoice";

interface MergedTransaction {
  kind: "order" | "invoice";
  id: string;
  date: string;
  reference: string | null;
  amount: number;
  currency: string;
  status: string;
  href: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

interface ContactTransactionsTabProps {
  contactId: string;
  contactEmail: string | null;
  displayName: string;
}

export function ContactTransactionsTab({
  contactId,
  contactEmail,
  displayName,
}: ContactTransactionsTabProps) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("contact_id", contactId);
    params.set("limit", "200");
    if (dateFrom) params.set("from", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) params.set("to", `${dateTo}T23:59:59.999Z`);

    try {
      const [ordersRes, invoicesRes] = await Promise.all([
        fetch(`/api/ecommerce/orders?${params.toString()}`),
        fetch(`/api/ecommerce/invoices?${params.toString()}`),
      ]);
      const ordersData = ordersRes.ok ? (await ordersRes.json()).orders ?? [] : [];
      const invoicesData = invoicesRes.ok ? (await invoicesRes.json()).invoices ?? [] : [];
      setOrders(ordersData);
      setInvoices(invoicesData);
    } catch {
      setOrders([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [contactId, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const merged: MergedTransaction[] = [
    ...orders.map((o) => ({
      kind: "order" as const,
      id: o.id,
      date: o.created_at,
      reference: o.order_number ?? null,
      amount: o.total,
      currency: o.currency,
      status: o.status,
      href: `/admin/ecommerce/orders/${o.id}`,
    })),
    ...invoices.map((i) => ({
      kind: "invoice" as const,
      id: i.id,
      date: i.created_at,
      reference: i.invoice_number,
      amount: i.total,
      currency: i.currency,
      status: i.status,
      href: `/admin/ecommerce/invoices/${i.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered =
    typeFilter === "all"
      ? merged
      : typeFilter === "order"
        ? merged.filter((m) => m.kind === "order")
        : merged.filter((m) => m.kind === "invoice");

  const newInvoiceUrl = `/admin/ecommerce/invoices/new?contact_id=${encodeURIComponent(contactId)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Orders and invoices for this contact. Use filters or start a new invoice.
            </CardDescription>
          </div>
          <Link href={newInvoiceUrl}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New invoice
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TransactionTypeFilter)}
            >
              <SelectTrigger className="w-[140px] h-8">
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
            <Label className="text-xs">From date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-[140px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-[140px]"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            <p className="mb-2">No transactions match.</p>
            <Link href={newInvoiceUrl}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New invoice
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-4 text-left align-middle font-medium">Date</th>
                  <th className="h-9 px-4 text-left align-middle font-medium">Type</th>
                  <th className="h-9 px-4 text-left align-middle font-medium">Reference</th>
                  <th className="h-9 px-4 text-right align-middle font-medium">Amount</th>
                  <th className="h-9 px-4 text-left align-middle font-medium">Status</th>
                  <th className="h-9 w-[80px] px-4 text-left align-middle font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filtered.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-b hover:bg-muted/50">
                    <td className="p-3 align-middle text-muted-foreground">
                      {format(new Date(row.date), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 align-middle capitalize">{row.kind}</td>
                    <td className="p-3 align-middle font-mono text-xs">
                      {row.reference ?? "—"}
                    </td>
                    <td className="p-3 align-middle text-right">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="p-3 align-middle">{row.status}</td>
                    <td className="p-3 align-middle">
                      <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                        <Link href={row.href}>View</Link>
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
  );
}
