/**
 * Schema-aware Supabase client for Next.js App Router.
 * Uses @supabase/ssr for proper cookie handling and SSR support.
 * Automatically uses the client's schema for all queries.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { getClientSchema } from "./schema";

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!_supabaseUrl || !_supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
  );
}

const supabaseUrl = _supabaseUrl;
const supabaseAnonKey = _supabaseAnonKey;

/**
 * Create a Supabase client for client-side usage (browser).
 * Uses @supabase/ssr createBrowserClient for proper cookie handling.
 * This client uses the anon key and respects Row Level Security (RLS).
 * 
 * @returns Supabase client configured for browser usage
 */
export function createClientSupabaseClient() {
  // Always create client - schema is optional for auth operations
  try {
    const schema = getClientSchema();
    // Auth operations don't need schema, but database queries do
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: schema,
      },
      auth: {
        // Ensure auth works even if schema is custom
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    // If schema is not set, create client without schema (will use default/public schema)
    // This is fine for auth operations
    console.warn("Client schema not configured, using default schema for auth:", error);
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
}

/**
 * Create a Supabase client for server-side usage with service role (admin operations).
 * This bypasses RLS and should only be used in API routes and server components
 * that require elevated permissions.
 * 
 * Note: This maintains backward compatibility with existing code that uses service role.
 * For SSR with user authentication, use createServerSupabaseClientSSR() instead.
 * 
 * @returns Supabase client with service role permissions
 */
export function createServerSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations"
    );
  }

  // Note: Supabase PostgREST doesn't support custom schemas via db.schema option
  // We'll use fully qualified table names (schema.table) in queries instead
  // The client is created without schema config, and we'll use schema.table format
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

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
  // Import cookies dynamically to avoid top-level import issues
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
