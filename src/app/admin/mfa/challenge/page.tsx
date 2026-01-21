import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getEnrolledFactors } from "@/lib/auth/mfa";
import { redirect } from "next/navigation";
import MFAChallenge from "@/components/auth/MFAChallenge";

export default async function MFAChallengePage() {
  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Check if user has enrolled factors
  const { factors } = await getEnrolledFactors();
  if (factors.length === 0) {
    // No factors enrolled, redirect to enrollment
    redirect("/admin/mfa/enroll");
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <MFAChallenge />
    </div>
  );
}
