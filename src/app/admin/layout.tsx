import { Sidebar } from "@/components/dashboard/Sidebar";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Check if user is superadmin for sidebar display
  const userIsSuperadmin = isSuperadmin(user);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isSuperadmin={userIsSuperadmin} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
