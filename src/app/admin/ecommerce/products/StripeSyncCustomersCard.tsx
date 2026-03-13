"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";

export function StripeSyncCustomersCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    errors: Array<{ stripe_customer_id: string; error: string }>;
  } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecommerce/stripe-sync-customers", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          created: 0,
          updated: 0,
          errors: [{ stripe_customer_id: "(request)", error: data.error ?? "Sync failed" }],
        });
        return;
      }
      setResult({
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        errors: data.errors ?? [],
      });
      router.refresh();
    } catch (e) {
      setResult({
        created: 0,
        updated: 0,
        errors: [
          {
            stripe_customer_id: "(request)",
            error: e instanceof Error ? e.message : "Sync failed",
          },
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
              <Users className="h-4 w-4" />
              Sync customers from Stripe
            </CardTitle>
            <CardDescription>
              Import Stripe customers into CRM contacts. For each Stripe customer: find by Stripe ID or email, create if missing, set external_stripe_id and update name/address from Stripe.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Syncing…
              </>
            ) : (
              "Sync customers from Stripe"
            )}
          </Button>
        </div>
      </CardHeader>
      {result && (
        <CardContent className="pt-0">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {(result.created > 0 || result.updated > 0) && (
              <p className="text-foreground">
                Created {result.created} contact(s), updated {result.updated} contact(s).
              </p>
            )}
            {result.errors.length > 0 && (
              <p className="text-destructive mt-1">
                {result.errors.length} error(s): {result.errors.map((e) => e.error).join("; ")}
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
