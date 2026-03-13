"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RefreshCw, ExternalLink } from "lucide-react";
import type { MemberSubscriptionItem } from "@/lib/shop/subscriptions";

export function MembersSubscriptionsClient() {
  const [subscriptions, setSubscriptions] = useState<MemberSubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members/subscriptions");
      if (!res.ok) return;
      const data = await res.json();
      setSubscriptions(data.subscriptions ?? []);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleManageInStripe = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/members/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not open billing portal.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error("Portal session:", e);
      alert("Something went wrong. Try again later.");
    } finally {
      setPortalLoading(false);
    }
  };

  const statusVariant = (status: string) => {
    if (status === "active") return "default";
    if (status === "canceled" || status === "unpaid") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading your subscriptions…</div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>You have no active subscriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            When you subscribe to a product, it will appear here. You can manage or cancel in Stripe at any time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Your subscriptions</CardTitle>
            <CardDescription>Next billing date and status. Use the button below to manage or cancel in Stripe.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchSubscriptions()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-4">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <div className="font-medium">{sub.product_title}</div>
                <div className="text-sm text-muted-foreground">
                  Next billing: {sub.current_period_end
                    ? format(new Date(sub.current_period_end), "MMM d, yyyy")
                    : "—"}
                </div>
              </div>
              <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
            </li>
          ))}
        </ul>
        <Button
          onClick={handleManageInStripe}
          disabled={portalLoading}
          className="w-full sm:w-auto"
        >
          {portalLoading ? "Opening…" : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage in Stripe
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
