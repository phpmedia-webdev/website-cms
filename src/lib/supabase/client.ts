/**
 * Schema-aware Supabase client for Next.js App Router.
 * Uses @supabase/ssr for proper cookie handling and SSR support.
 * For server-only service-role use (e.g. public forms, CRM), use server-service.ts instead
 * so those routes never load auth-js.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { getClientSchema } from "./schema";
import { getSupabaseEnv } from "./supabase-env";

export { getSupabaseEnv };

/**
 * Create a Supabase client for client-side usage (browser).
 * Uses @supabase/ssr createBrowserClient for proper cookie handling.
 * This client uses the anon key and respects Row Level Security (RLS).
 * 
 * @returns Supabase client configured for browser usage
 */
export function createClientSupabaseClient() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
  try {
    const schema = getClientSchema();
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: schema,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    console.warn("Client schema not configured, using default schema for auth:", error);
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
}

/** Re-export for callers that still import from client. Prefer importing from server-service for public routes (e.g. forms). */
export { createServerSupabaseClient } from "./server-service";

/**
 * Create a Supabase client for server-side usage with SSR support (Server Components, API Routes).
 * Uses @supabase/ssr createServerClient for proper cookie handling in SSR.
 * This client uses the anon key and respects Row Level Security (RLS).
 * 
 * Use this for server components and API routes that need user authentication via cookies.
 * 
 * @returns Supabase client configured for SSR with user authentication
 */
export async function createServerSupabaseClientSSR() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: { path?: string } }[]) {
        try {
          cookiesToSet.forEach((c: { name: string; value: string; options?: { path?: string } }) =>
            cookieStore.set(c.name, c.value, c.options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    db: {
      schema: getClientSchema(),
    },
  });
}

/**
 * Default client for client-side components.
 * Use this in React components with "use client" directive.
 * 
 * Note: This is created lazily to avoid initialization errors if env vars aren't ready.
 */
let _supabaseClient: ReturnType<typeof createClientSupabaseClient> | null = null;

export function getSupabaseClient() {
  if (!_supabaseClient) {
    _supabaseClient = createClientSupabaseClient();
  }
  return _supabaseClient;
}

// Export as default for backward compatibility
export const supabase = getSupabaseClient();
