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
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { InvoiceRow, InvoiceStatus } from "@/lib/shop/invoices";

const STATUS_OPTIONS: { value: InvoiceStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "open", label: "Open" },
  { value: "paid", label: "Paid" },
];

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function InvoicesListClient() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/ecommerce/invoices?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load invoices");
      }
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    } catch (e) {
      console.error("fetchInvoices:", e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-2">
          Create one-off invoices, add products from your library, and push to Stripe to send to customers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All invoices</CardTitle>
              <CardDescription>
                Filter by status. Draft invoices can be edited; after pushing to Stripe they are sent and tracked.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchInvoices()} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => setStatusFilter((v === "all" ? "" : v) as InvoiceStatus | "")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p>No invoices match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50 hover:bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Number</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Customer</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-right align-middle font-medium">Total</th>
                    <th className="h-10 w-[80px] px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle text-muted-foreground">
                        {inv.created_at
                          ? format(new Date(inv.created_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="p-4 align-middle font-mono text-xs">
                        {inv.invoice_number ?? "—"}
                      </td>
                      <td className="p-4 align-middle">{inv.customer_email || "—"}</td>
                      <td className="p-4 align-middle">
                        <Badge
                          variant={
                            inv.status === "paid"
                              ? "default"
                              : inv.status === "draft"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="p-4 align-middle">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/ecommerce/invoices/${inv.id}`}>
                            {inv.status === "draft" ? "Edit" : "View"}
                          </Link>
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
