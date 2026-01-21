import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import MFAManagement from "@/components/auth/MFAManagement";

export default async function SecuritySettingsPage() {
  // Check if user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your two-factor authentication and security preferences
        </p>
      </div>

      <MFAManagement />
    </div>
  );
}
