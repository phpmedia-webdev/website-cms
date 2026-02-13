import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import MFASuccessClient from "@/components/auth/MFASuccessClient";

const MFA_UPGRADE_COOKIE = "sb-mfa-upgrade";

/**
 * GET /admin/mfa/success
 * Renders a page that runs applyMfaUpgrade (Server Action) on mount.
 * The Server Action sets AAL2 session cookies; the client then redirects.
 * Using a page + Server Action ensures cookies are written before the redirect.
 */
export default async function MFASuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirect || "/admin/dashboard";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin/dashboard";

  const cookieStore = await cookies();
  if (!cookieStore.get(MFA_UPGRADE_COOKIE)?.value) {
    redirect(`/admin/mfa/challenge?error=missing&redirect=${encodeURIComponent(safeRedirect)}`);
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <MFASuccessClient />
    </div>
  );
}
