"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Send, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { InvoiceWithLines, InvoiceLineRow } from "@/lib/shop/invoices";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

interface ProductOption {
  content_id: string;
  title: string;
  price: number;
  currency: string;
}

interface InvoiceDetailClientProps {
  invoiceId: string;
  initialInvoice: InvoiceWithLines;
}

export function InvoiceDetailClient({ invoiceId, initialInvoice }: InvoiceDetailClientProps) {
  const [invoice, setInvoice] = useState<InvoiceWithLines>(initialInvoice);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ecommerce/invoices/${invoiceId}`);
      if (!res.ok) return;
      const data = await res.json();
      setInvoice((prev) => data.invoice ?? prev);
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ecommerce/invoices/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products ?? []);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const isDraft = invoice.status === "draft";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/ecommerce/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {invoice.invoice_number ?? "Draft invoice"}
          </h1>
          <p className="text-muted-foreground">
            {invoice.customer_email} · {format(new Date(invoice.created_at), "MMM d, yyyy")}
          </p>
        </div>
        <Badge
          variant={
            invoice.status === "paid"
              ? "default"
              : invoice.status === "draft"
                ? "outline"
                : "secondary"
          }
        >
          {invoice.status}
        </Badge>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Customer and due date. When draft, you can add line items and push to Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer email</Label>
              <Input
                value={invoice.customer_email}
                readOnly={!isDraft}
                onChange={(e) =>
                  isDraft && setInvoice((prev) => ({ ...prev, customer_email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={invoice.due_date ? invoice.due_date.slice(0, 10) : ""}
                readOnly={!isDraft}
                onChange={(e) =>
                  isDraft &&
                  setInvoice((prev) => ({
                    ...prev,
                    due_date: e.target.value ? e.target.value : null,
                  }))
                }
              />
            </div>
          </div>
          {isDraft && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setError(null);
                const res = await fetch(`/api/ecommerce/invoices/${invoiceId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    customer_email: invoice.customer_email,
                    due_date: invoice.due_date || null,
                  }),
                });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  setError(d.error ?? "Failed to update");
                  return;
                }
                setError(null);
              }}
            >
              Save details
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>
            Products from your library. Each line can have an editable description (like QuickBooks).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left align-middle font-medium">Description</th>
                      <th className="h-10 px-4 text-right align-middle font-medium">Qty</th>
                      <th className="h-10 px-4 text-right align-middle font-medium">Unit price</th>
                      <th className="h-10 px-4 text-right align-middle font-medium">Total</th>
                      {isDraft && (
                        <th className="h-10 w-[100px] px-4 text-left align-middle font-medium">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {invoice.lines.length === 0 ? (
                      <tr>
                        <td colSpan={isDraft ? 5 : 4} className="p-4 text-center text-muted-foreground">
                          No line items. Add products below (draft only).
                        </td>
                      </tr>
                    ) : (
                      invoice.lines.map((line) => (
                        <LineRow
                          key={line.id}
                          line={line}
                          currency={invoice.currency}
                          isDraft={isDraft}
                          onUpdate={fetchInvoice}
                          setError={setError}
                          invoiceId={invoiceId}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-right font-medium">
                Total: {formatCurrency(invoice.total, invoice.currency)}
              </div>

              {isDraft && (
                <AddLineForm
                  products={products}
                  currency={invoice.currency}
                  invoiceId={invoiceId}
                  onAdded={fetchInvoice}
                  setError={setError}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isDraft && invoice.lines.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Push to Stripe to create the invoice there and send it to the customer by email.
              </p>
              <Button
                onClick={async () => {
                  setError(null);
                  setPushLoading(true);
                  try {
                    const res = await fetch(`/api/ecommerce/invoices/${invoiceId}/push`, {
                      method: "POST",
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setError(data.error ?? "Failed to push to Stripe");
                      return;
                    }
                    await fetchInvoice();
                  } finally {
                    setPushLoading(false);
                  }
                }}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Push to Stripe and send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isDraft && invoice.stripe_invoice_id && (
        <Card>
          <CardContent className="pt-6">
            <a
              href={`https://dashboard.stripe.com/invoices/${invoice.stripe_invoice_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View in Stripe Dashboard →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LineRow({
  line,
  currency,
  isDraft,
  onUpdate,
  setError,
  invoiceId,
}: {
  line: InvoiceLineRow;
  currency: string;
  isDraft: boolean;
  onUpdate: () => void;
  setError: (s: string | null) => void;
  invoiceId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(line.line_description ?? "");
  const [qty, setQty] = useState(String(line.quantity));
  const [unitPrice, setUnitPrice] = useState(String(line.unit_price));

  const handleSave = async () => {
    const res = await fetch(`/api/ecommerce/invoices/${invoiceId}/lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line_description: desc || null,
        quantity: Number(qty) || 1,
        unit_price: Number(unitPrice) ?? 0,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to update line");
      return;
    }
    setError(null);
    setEditing(false);
    onUpdate();
  };

  const handleRemove = async () => {
    if (!confirm("Remove this line?")) return;
    const res = await fetch(`/api/ecommerce/invoices/${invoiceId}/lines/${line.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to remove line");
      return;
    }
    setError(null);
    onUpdate();
  };

  const displayDesc = line.line_description?.trim() || `Line (qty ${line.quantity})`;

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-4 align-middle">
        {editing ? (
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Line description"
            className="max-w-xs"
          />
        ) : (
          <span className="text-muted-foreground">{displayDesc}</span>
        )}
      </td>
      <td className="p-4 align-middle text-right">
        {editing ? (
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-20 text-right"
          />
        ) : (
          line.quantity
        )}
      </td>
      <td className="p-4 align-middle text-right">
        {editing ? (
          <Input
            type="number"
            min={0}
            step={0.01}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="w-24 text-right"
          />
        ) : (
          formatCurrency(line.unit_price, currency)
        )}
      </td>
      <td className="p-4 align-middle text-right">
        {formatCurrency(line.line_total, currency)}
      </td>
      {isDraft && (
        <td className="p-4 align-middle">
          {editing ? (
            <Button size="sm" variant="outline" onClick={handleSave}>
              Save
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="mr-1"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRemove}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </td>
      )}
    </tr>
  );
}

function AddLineForm({
  products,
  currency,
  invoiceId,
  onAdded,
  setError,
}: {
  products: ProductOption[];
  currency: string;
  invoiceId: string;
  onAdded: () => void;
  setError: (s: string | null) => void;
}) {
  const [content_id, setContent_id] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit_price, setUnit_price] = useState("");
  const [line_description, setLine_description] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.content_id === content_id);
  useEffect(() => {
    if (selectedProduct && !unit_price) {
      setUnit_price(String(selectedProduct.price));
    }
  }, [selectedProduct, unit_price]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content_id.trim()) {
      setError("Select a product.");
      return;
    }
    const qty = Number(quantity);
    const price = Number(unit_price);
    if (!Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
      setError("Invalid quantity or unit price.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/ecommerce/invoices/${invoiceId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id,
          quantity: qty,
          unit_price: price,
          line_description: line_description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to add line");
        return;
      }
      setContent_id("");
      setQuantity("1");
      setUnit_price("");
      setLine_description("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label>Product</Label>
        <Select value={content_id} onValueChange={setContent_id} required>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.content_id} value={p.content_id}>
                {p.title} — {formatCurrency(p.price, p.currency)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Qty</Label>
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20"
        />
      </div>
      <div className="space-y-2">
        <Label>Unit price</Label>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={unit_price}
          onChange={(e) => setUnit_price(e.target.value)}
          className="w-28"
        />
      </div>
      <div className="space-y-2 flex-1 min-w-[200px]">
        <Label>Line description (optional)</Label>
        <Input
          value={line_description}
          onChange={(e) => setLine_description(e.target.value)}
          placeholder="e.g. custom note for this line"
        />
      </div>
      <Button type="submit" size="sm" disabled={submitting || products.length === 0}>
        <Plus className="h-4 w-4 mr-1" />
        Add line
      </Button>
    </form>
  );
}
