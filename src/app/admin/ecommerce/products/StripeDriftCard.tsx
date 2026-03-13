"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Download, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import type { StripeDriftReport, DriftItemStripeOnly, DriftItemAppOnly, DriftItemDiffering } from "@/lib/shop/stripe-drift";

export function StripeDriftCard() {
  const router = useRouter();
  const [report, setReport] = useState<StripeDriftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    imported: Array<{ content_id: string; slug: string; title: string }>;
    errors: Array<{ stripe_product_id: string; error: string }>;
  } | null>(null);

  const fetchDrift = async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/ecommerce/stripe-drift");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load drift report");
      setReport(data);
    } catch (e) {
      setReport({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        inStripeNotInApp: [],
        inAppNotInStripe: [],
        differing: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (stripeProductId: string) => {
    try {
      const res = await fetch("/api/ecommerce/stripe-drift/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_product_id: stripeProductId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Import failed");
      }
      router.refresh();
      await fetchDrift();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    }
  };

  const handleUpdate = async (contentId: string) => {
    try {
      const res = await fetch("/api/ecommerce/stripe-drift/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Update failed");
      }
      router.refresh();
      await fetchDrift();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleBulkImport = async () => {
    if (!report?.ok || report.inStripeNotInApp.length === 0) return;
    setBulkImporting(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/ecommerce/stripe-drift/bulk-import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Bulk import failed");
      setBulkResult({ imported: data.imported ?? [], errors: data.errors ?? [] });
      router.refresh();
      await fetchDrift();
    } catch (e) {
      setBulkResult({
        imported: [],
        errors: [{ stripe_product_id: "(request)", error: e instanceof Error ? e.message : "Bulk import failed" }],
      });
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Reconcile with Stripe</CardTitle>
            <CardDescription>
              Compare Stripe Products to app products. Import from Stripe or update app from Stripe to fix drift.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDrift} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking…" : "Check Stripe sync"}
          </Button>
        </div>
      </CardHeader>
      {report && (
        <CardContent className="space-y-4">
          {!report.ok && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {report.error}
            </div>
          )}
          {report.ok && (
            <>
              {report.inStripeNotInApp.length === 0 &&
                report.inAppNotInStripe.length === 0 &&
                report.differing.length === 0 && (
                  <p className="text-sm text-muted-foreground">No drift. Stripe and app are in sync.</p>
                )}
              {report.inStripeNotInApp.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    In Stripe, not in app ({report.inStripeNotInApp.length})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleBulkImport}
                      disabled={bulkImporting}
                    >
                      {bulkImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Importing…
                        </>
                      ) : (
                        "Import all"
                      )}
                    </Button>
                  </div>
                  {bulkResult && (bulkResult.imported.length > 0 || bulkResult.errors.length > 0) && (
                    <div className="rounded-md border bg-muted/30 p-2 mb-2 text-sm">
                      {bulkResult.imported.length > 0 && (
                        <p className="text-foreground">
                          Imported {bulkResult.imported.length}: {bulkResult.imported.map((i) => i.title).join(", ")}
                        </p>
                      )}
                      {bulkResult.errors.length > 0 && (
                        <p className="text-destructive mt-1">
                          {bulkResult.errors.length} failed: {bulkResult.errors.map((e) => e.error).join("; ")}
                        </p>
                      )}
                    </div>
                  )}
                  <ul className="space-y-2 rounded-md border p-3 text-sm">
                    {(report.inStripeNotInApp as DriftItemStripeOnly[]).map((item) => (
                      <li key={item.stripe_product.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong>{item.stripe_product.name}</strong> — {item.stripe_product.id}
                          {item.stripe_product.unit_amount != null && (
                            <span className="text-muted-foreground ml-1">
                              ${(item.stripe_product.unit_amount / 100).toFixed(2)} {item.stripe_product.currency}
                            </span>
                          )}
                        </span>
                        <Button size="sm" variant="secondary" onClick={() => handleImport(item.stripe_product.id)}>
                          Import from Stripe
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {report.inAppNotInStripe.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    In app, not in Stripe ({report.inAppNotInStripe.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    App product has a Stripe ID but that product no longer exists in Stripe. Edit the product to clear or change the link.
                  </p>
                  <ul className="space-y-1 rounded-md border p-3 text-sm">
                    {(report.inAppNotInStripe as DriftItemAppOnly[]).map((item) => (
                      <li key={item.app_product.content_id}>
                        <strong>{item.app_product.title}</strong> — {item.app_product.stripe_product_id}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {report.differing.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Differing ({report.differing.length})
                  </h3>
                  <ul className="space-y-2 rounded-md border p-3 text-sm">
                    {(report.differing as DriftItemDiffering[]).map((item) => (
                      <li key={item.app_product.content_id} className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong>{item.app_product.title}</strong>
                          <ul className="text-muted-foreground text-xs mt-1 list-disc list-inside">
                            {item.differences.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => handleUpdate(item.app_product.content_id)}>
                          Update from Stripe
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
