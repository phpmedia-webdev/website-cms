import { redirect } from "next/navigation";

/** Redirect to standalone MFA challenge page. */
export default async function AdminMfaChallengeRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.redirect) q.set("redirect", params.redirect);
  if (params.error) q.set("error", params.error);
  const query = q.toString();
  redirect(query ? `/mfa/challenge?${query}` : "/mfa/challenge");
}
