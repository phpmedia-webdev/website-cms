import { listContactOrganizationMatchReviews } from "@/lib/supabase/organizations";
import { PhoneMatchReviewsClient } from "./PhoneMatchReviewsClient";

export default async function ReviewsPage() {
  const initialReviews = await listContactOrganizationMatchReviews({ status: "suggested" });
  return (
    <div className="p-6">
      <PhoneMatchReviewsClient initialReviews={initialReviews} />
    </div>
  );
}
