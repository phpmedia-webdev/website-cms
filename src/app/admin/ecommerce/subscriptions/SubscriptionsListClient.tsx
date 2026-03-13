"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { SubscriptionListItem } from "@/lib/shop/subscriptions";

const STRIPE_DASHBOARD_SUBSCRIPTIONS = "https://dashboard.stripe.com/subscriptions";

export function SubscriptionsListClient() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ecommerce/subscriptions");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load subscriptions");
      }
      const data = await res.json();
      setSubscriptions(data.subscriptions ?? []);
    } catch (e) {
      console.error("fetchSubscriptions:", e);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const statusVariant = (status: string) => {
    if (status === "active") return "default";
    if (status === "canceled" || status === "unpaid") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-2">
          View all customers and active subscriptions. Data is updated from Stripe via webhooks. Open in Stripe to manage or cancel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All subscriptions</CardTitle>
              <CardDescription>
                Customer, product, status, and current period end. Link to Stripe dashboard for each subscription.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchSubscriptions()} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading subscriptions…</div>
          ) : subscriptions.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p>No subscriptions yet.</p>
              <p className="text-sm mt-1">Subscriptions appear here after customers complete a subscription checkout; state is synced from Stripe webhooks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50 hover:bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium">Customer</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Product</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Current period end</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Stripe</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <div>
                          <span className="font-medium">{sub.customer_name || sub.customer_email || "—"}</span>
                          {sub.customer_email && sub.customer_name && (
                            <div className="text-muted-foreground text-xs">{sub.customer_email}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle">{sub.product_title}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {sub.current_period_end
                          ? format(new Date(sub.current_period_end), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="p-4 align-middle">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`${STRIPE_DASHBOARD_SUBSCRIPTIONS}/${sub.stripe_subscription_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open in Stripe
                          </a>
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
