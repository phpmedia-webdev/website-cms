/**
 * Schema-aware Supabase client.
 * Automatically uses the client's schema for all queries.
 */

import { createClient } from "@supabase/supabase-js";
import { getClientSchema } from "./schema";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
  );
}

/**
 * Create a Supabase client for client-side usage.
 * This client uses the anon key and respects Row Level Security (RLS).
 */
export function createClientSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: getClientSchema(),
    },
  });
}

/**
 * Create a Supabase client for server-side usage with service role.
 * This bypasses RLS and should only be used in API routes and server components.
 */
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: {
      schema: getClientSchema(),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Default client for client-side components.
 * Use this in React components with "use client" directive.
 */
export const supabase = createClientSupabaseClient();
