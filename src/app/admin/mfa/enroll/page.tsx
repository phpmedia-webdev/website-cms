import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { hasEnrolledFactors } from "@/lib/auth/mfa";
import { redirect } from "next/navigation";
import MFAEnroll from "@/components/auth/MFAEnroll";

export default async function MFAEnrollPage() {
  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Already have factors → verify with challenge (or go to Security to manage)
  const hasFactors = await hasEnrolledFactors();
  if (hasFactors) {
    redirect("/admin/mfa/challenge?redirect=/admin/dashboard");
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <MFAEnroll />
    </div>
  );
}
