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

  if (!upgradeCookie) {
    return { ok: false, error: "missing" };
  }

  const tokens = decodeUpgradeCookie(upgradeCookie);
  if (!tokens) {
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

  if (error) {
    return { ok: false, error: "invalid" };
  }

  await Promise.race([
    flushDone,
    new Promise<void>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
  ]).catch(() => {});

  cookieStore.set(MFA_UPGRADE_COOKIE, "", { path: "/admin/mfa", maxAge: 0 });

  return { ok: true };
}
