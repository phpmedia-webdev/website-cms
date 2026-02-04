import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";
import { getRoleForCurrentUser } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";

/**
 * Admin layout for all /admin/* routes.
 *
 * Fetches site name and role for the header; passes to client wrapper.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  const userIsSuperadmin = user ? isSuperadmin(user) : false;

  let siteName: string | null = null;
  let role: string | null = null;
  if (user) {
    try {
      role = await getRoleForCurrentUser();
      const schema = getClientSchema();
      const site = await getTenantSiteBySchema(schema);
      siteName = site?.name ?? null;
    } catch {
      // No schema or tenant (e.g. platform-only dev); role may still be superadmin
      if (userIsSuperadmin) role = "superadmin";
    }
  }

  return (
    <AdminLayoutWrapper
      isSuperadmin={userIsSuperadmin}
      siteName={siteName}
      role={role}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
