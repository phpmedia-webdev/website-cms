"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2 } from "lucide-react";

export function StripeSyncOrdersCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: Array<{ invoice_id: string; error: string }>;
  } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body: { created_gte?: number; created_lte?: number; customer_id?: string } = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (!isNaN(d.getTime())) body.created_gte = Math.floor(d.getTime() / 1000);
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (!isNaN(d.getTime())) body.created_lte = Math.floor(d.getTime() / 1000);
      }
      if (customerId.trim()) body.customer_id = customerId.trim();

      const res = await fetch("/api/ecommerce/stripe-sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          created: 0,
          skipped: 0,
          errors: [{ invoice_id: "(request)", error: data.error ?? "Sync failed" }],
        });
        return;
      }
      setResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      router.refresh();
    } catch (e) {
      setResult({
        created: 0,
        skipped: 0,
        errors: [
          { invoice_id: "(request)", error: e instanceof Error ? e.message : "Sync failed" },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Sync order history from Stripe
            </CardTitle>
            <CardDescription>
              Import paid Stripe invoices as orders. For each paid invoice not already in the app, the customer is synced to CRM (if needed) and an order + line items are created. Idempotent by invoice ID.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="sync-date-from">From date (optional)</Label>
            <Input
              id="sync-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sync-date-to">To date (optional)</Label>
            <Input
              id="sync-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sync-customer-id">Stripe customer ID (optional)</Label>
            <Input
              id="sync-customer-id"
              placeholder="cus_…"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-48 font-mono text-sm"
            />
          </div>
          <Button onClick={handleSync} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing…
              </>
            ) : (
              "Sync orders from Stripe"
            )}
          </Button>
        </div>
        {result && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {(result.created > 0 || result.skipped > 0) && (
              <p className="text-foreground">
                Created {result.created} order(s), skipped {result.skipped} (already in app).
              </p>
            )}
            {result.errors.length > 0 && (
              <p className="text-destructive mt-1">
                {result.errors.length} error(s): {result.errors.map((e) => e.error).join("; ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
