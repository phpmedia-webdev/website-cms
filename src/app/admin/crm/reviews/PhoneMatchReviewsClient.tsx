"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ContactOrganizationMatchReviewView } from "@/lib/supabase/organizations";

interface PhoneMatchReviewsClientProps {
  initialReviews: ContactOrganizationMatchReviewView[];
}

export function PhoneMatchReviewsClient({ initialReviews }: PhoneMatchReviewsClientProps) {
  const [reviews, setReviews] = useState<ContactOrganizationMatchReviewView[]>(initialReviews);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/reviews/phone-matches");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  const act = async (reviewId: string, status: "confirmed" | "rejected") => {
    setActingId(reviewId);
    try {
      const res = await fetch("/api/crm/reviews/phone-matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, status }),
      });
      if (res.ok) {
        await refresh();
      }
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Phone match reviews</h1>
          <p className="text-muted-foreground mt-1">
            Review ambiguous phone matches and confirm or reject organization links.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No phone-match reviews waiting right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {review.contact_name ?? review.contact_email ?? review.contact_id}
                      </span>
                      <span className="text-xs text-muted-foreground">phone {review.phone}</span>
                      <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                        {review.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.organization_name ?? "Unknown organization"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => act(review.id, "confirmed")}
                      disabled={actingId === review.id || review.status === "confirmed"}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act(review.id, "rejected")}
                      disabled={actingId === review.id || review.status === "rejected"}
                    >
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/crm/contacts/${review.contact_id}`}>Open contact</Link>
                    </Button>
                    {review.organization_id && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/admin/crm/organizations/${review.organization_id}`}>Open org</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
