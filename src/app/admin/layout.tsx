import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";

/**
 * Admin layout for all /admin/* routes.
 * 
 * Best Practice Approach:
 * - Server component handles authentication check
 * - Client component wrapper handles route-based conditional rendering
 * - Uses Next.js usePathname() hook (proper way to access pathname)
 * - No custom headers or workarounds needed
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try to get user (may be null on login page, which is fine)
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // If getCurrentUser fails (e.g., no session), user will be null
    // This is expected on the login page
    user = null;
  }

  // Determine if user is superadmin (only if user exists)
  const userIsSuperadmin = user ? isSuperadmin(user) : false;

  // Use client component wrapper to handle pathname-based conditional rendering
  // This is the proper Next.js way - usePathname() hook in a client component
  return (
    <AdminLayoutWrapper isSuperadmin={userIsSuperadmin}>
      {children}
    </AdminLayoutWrapper>
  );
}
