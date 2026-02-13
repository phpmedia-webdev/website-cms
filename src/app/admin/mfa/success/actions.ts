"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

const MFA_UPGRADE_COOKIE = "sb-mfa-upgrade";

function decodeUpgradeCookie(value: string): { access_token: string; refresh_token: string } | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { access_token?: string; refresh_token?: string };
    if (typeof parsed.access_token === "string" && typeof parsed.refresh_token === "string") {
      return { access_token: parsed.access_token, refresh_token: parsed.refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Applies MFA upgrade: reads short-lived cookie, sets Supabase session (AAL2) via cookies().
 * Server Action ensures setAll runs in same request before returning, so response includes cookies.
 */
export async function applyMfaUpgrade(): Promise<{ ok: boolean; error?: string }> {
  const cookieStore = await cookies();
  const upgradeCookie = cookieStore.get(MFA_UPGRADE_COOKIE)?.value;

  // MFA_TRACE: Server Action started; check if upgrade cookie arrived
  const allCookies = cookieStore.getAll();
  const upgradePresent = !!upgradeCookie;
  console.log("MFA_TRACE [applyMfaUpgrade] start, upgradeCookie present:", upgradePresent, "all cookie names:", allCookies.map((c) => c.name));

  if (!upgradeCookie) {
    return { ok: false, error: "missing" };
  }

  const tokens = decodeUpgradeCookie(upgradeCookie);
  if (!tokens) {
    console.log("MFA_TRACE [applyMfaUpgrade] decode failed");
    return { ok: false, error: "invalid" };
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
  let resolveFlush: () => void;
  const flushDone = new Promise<void>((r) => {
    resolveFlush = r;
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        // MFA_TRACE: Supabase onAuthStateChange triggered setAll (session cookies)
        console.log("MFA_TRACE [applyMfaUpgrade] setAll called, count:", cookiesToSet.length, "names:", cookiesToSet.map((c) => c.name));
        cookiesToSet.forEach((c) => {
          const opts = c.options as { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" } | undefined;
          cookieStore.set(c.name, c.value, {
            path: opts?.path ?? "/",
            maxAge: opts?.maxAge,
            httpOnly: opts?.httpOnly,
            secure: opts?.secure,
            sameSite: (opts?.sameSite as "lax" | "strict") ?? "lax",
          });
        });
        resolveFlush?.();
      },
    },
    db: { schema: getClientSchema() },
  });

  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  // MFA_TRACE: setSession completed; did setAll run (before or after)?
  console.log("MFA_TRACE [applyMfaUpgrade] setSession done, error:", error?.message ?? null);

  if (error) {
    return { ok: false, error: "invalid" };
  }

  await Promise.race([
    flushDone,
    new Promise<void>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
  ]).catch(() => {});

  cookieStore.set(MFA_UPGRADE_COOKIE, "", { path: "/admin/mfa", maxAge: 0 });

  // MFA_TRACE: returning ok; cookies should be in response
  console.log("MFA_TRACE [applyMfaUpgrade] returning ok");
  return { ok: true };
}
