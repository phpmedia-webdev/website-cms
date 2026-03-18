import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  listContactOrganizationMatchReviews,
  reviewContactOrganizationMatch,
} from "@/lib/supabase/organizations";

/**
 * GET /api/crm/reviews/phone-matches
 * List phone-based organization/contact match reviews.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const reviews = await listContactOrganizationMatchReviews(
      status === "suggested" || status === "confirmed" || status === "rejected"
        ? { status }
        : undefined
    );
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error listing phone-match reviews:", error);
    return NextResponse.json({ error: "Failed to list reviews" }, { status: 500 });
  }
}

/**
 * PATCH /api/crm/reviews/phone-matches
 * Body: { review_id, status } where status is confirmed or rejected.
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const reviewId = typeof body?.review_id === "string" ? body.review_id : "";
    const status = body?.status === "confirmed" || body?.status === "rejected" ? body.status : null;
    if (!reviewId || !status) {
      return NextResponse.json({ error: "Invalid review action" }, { status: 400 });
    }
    const { review, error } = await reviewContactOrganizationMatch(reviewId, status, user.id);
    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to update review" },
        { status: 500 }
      );
    }
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error updating phone-match review:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
