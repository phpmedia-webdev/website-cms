import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { cookies } from "next/headers";

/** Decode JWT payload without verifying (for debug). Returns payload or null. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/mfa/debug-session
 * Returns the session AAL the server sees from cookies. Decodes access_token JWT to read aal claim.
 * Remove or restrict in production.
 */
export async function GET() {
  try {
    const { url, anonKey } = getSupabaseEnv();
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
      db: { schema: getClientSchema() },
    });
    const { data: { session } } = await supabase.auth.getSession();
    const aalFromSession = (session as { aal?: string })?.aal ?? null;
    const accessToken = session?.access_token ?? null;
    const tokenPayload = accessToken ? decodeJwtPayload(accessToken) : null;
    const aalFromToken = tokenPayload && typeof tokenPayload.aal === "string" ? tokenPayload.aal : null;
    return NextResponse.json({
      aal: aalFromSession,
      aalFromToken,
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      tokenHasAal: !!tokenPayload && "aal" in tokenPayload,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
