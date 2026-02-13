import { redirect } from "next/navigation";

/** MFA success: no longer used in flow (verify redirects directly to destination). Redirect to dashboard. */
export default async function AdminMfaSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const target = params.redirect?.startsWith("/") ? params.redirect : "/admin/dashboard";
  redirect(target);
}
