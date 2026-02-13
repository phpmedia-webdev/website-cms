import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import MFAEnroll from "@/components/auth/MFAEnroll";

/**
 * MFA enrollment page: first-time setup or add another authenticator.
 * Does NOT redirect when user already has factors — allows "Add another" from Security.
 */
export default async function MFAEnrollPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <MFAEnroll />
    </div>
  );
}
