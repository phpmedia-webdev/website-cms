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

  // Check if user already has enrolled factors
  const hasFactors = await hasEnrolledFactors();
  if (hasFactors) {
    // User already has factors, redirect to settings or dashboard
    redirect("/admin/settings");
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <MFAEnroll />
    </div>
  );
}
