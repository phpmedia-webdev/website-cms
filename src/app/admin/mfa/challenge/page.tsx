import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getEnrolledFactors } from "@/lib/auth/mfa";
import { redirect } from "next/navigation";
import MFAChallenge from "@/components/auth/MFAChallenge";

/** MFA challenge page: enter code to reach AAL2. Under admin so it uses admin layout. */
export default async function AdminMfaChallengePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const { factors } = await getEnrolledFactors();
  if (factors.length === 0) {
    redirect("/admin/mfa/enroll");
  }

  return (
    <div className="w-full max-w-md">
      <MFAChallenge />
    </div>
  );
}
