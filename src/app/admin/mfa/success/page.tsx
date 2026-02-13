import { redirect } from "next/navigation";

/** Redirect to standalone MFA success page. */
export default async function AdminMfaSuccessRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const query = params.redirect ? `?redirect=${encodeURIComponent(params.redirect)}` : "";
  redirect(`/mfa/success${query}`);
}
