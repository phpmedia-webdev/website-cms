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

  // Check if user already has enrolled factors → send to My Profile (Security section)
  const hasFactors = await hasEnrolledFactors();
  if (hasFactors) {
    redirect("/admin/settings/profile");
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <MFAEnroll />
    </div>
  );
}
