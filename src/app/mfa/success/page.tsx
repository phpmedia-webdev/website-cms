import MFASuccessClient from "@/components/auth/MFASuccessClient";

/**
 * GET /mfa/success
 * Standalone success page with delay and message before redirecting to admin.
 */
export default async function MFASuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirect || "/admin/dashboard";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin/dashboard";

  return (
    <div className="w-full max-w-md text-center">
      <MFASuccessClient redirect={safeRedirect} />
    </div>
  );
}
