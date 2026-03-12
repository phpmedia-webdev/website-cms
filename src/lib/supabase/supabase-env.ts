/**
 * Supabase env helpers only. No Supabase packages imported.
 * Used by server-service (public forms, CRM) and client (browser/SSR auth).
 */

const SUPABASE_ENV_ERROR =
  "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required";

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error(SUPABASE_ENV_ERROR);
  return { url, anonKey };
}
