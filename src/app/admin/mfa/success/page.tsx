import MFASuccessClient from "@/components/auth/MFASuccessClient";

/**
 * GET /admin/mfa/success
 * Intermediate page after MFA verify. AAL2 cookies are set in the verify redirect response;
 * this page lets the browser apply them before we redirect to the final destination.
 * No Server Action — just client-side redirect.
 */
export default async function MFASuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="container mx-auto max-w-md py-8">
      <MFASuccessClient redirect={params.redirect || "/admin/dashboard"} />
    </div>
  );
}
