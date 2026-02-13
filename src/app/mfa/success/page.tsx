import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MFASuccessClient from "@/components/auth/MFASuccessClient";
import { createServerSupabaseClient } from "@/lib/supabase/client";

type CookieRow = { name: string; value: string; options?: { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: string } };

/**
 * GET /mfa/success
 * If ?t=TOKEN present: load one-time cookies from DB, set on this response, delete token.
 * Cookies are set on the document response so the browser applies them reliably (Vercel fix).
 */
export default async function MFASuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const token = params.t?.trim();
  const redirectTo = params.redirect || "/admin/dashboard";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin/dashboard";

  if (!token) {
    redirect(`/mfa/challenge?redirect=${encodeURIComponent(safeRedirect)}`);
  }

  const admin = createServerSupabaseClient();
  const { data: row, error } = await admin
    .from("mfa_upgrade_tokens")
    .select("cookies")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !row?.cookies || !Array.isArray(row.cookies)) {
    redirect(`/mfa/challenge?error=expired&redirect=${encodeURIComponent(safeRedirect)}`);
  }

  const cookieStore = await cookies();
  for (const c of row.cookies as CookieRow[]) {
    cookieStore.set(c.name, c.value, {
      path: c.options?.path ?? "/",
      maxAge: c.options?.maxAge,
      httpOnly: c.options?.httpOnly,
      secure: c.options?.secure,
      sameSite: (c.options?.sameSite as "lax" | "strict" | "none") ?? "lax",
    });
  }
  await admin.from("mfa_upgrade_tokens").delete().eq("token", token);

  return (
    <div className="w-full max-w-md text-center">
      <MFASuccessClient redirect={safeRedirect} />
    </div>
  );
}
