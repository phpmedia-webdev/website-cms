/**
 * Read signup_code_actions from tenant schema. Returns rows for the given code or default (signup_code IS NULL).
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import type { SignupActionRow } from "./types";

export async function getSignupActions(
  signupCode: string | null | undefined
): Promise<SignupActionRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const codeTrimmed =
    typeof signupCode === "string" ? signupCode.trim() || null : null;

  if (codeTrimmed) {
    const { data: codeRows, error: codeErr } = await supabase
      .schema(schema)
      .from("signup_code_actions")
      .select("id, signup_code, action_type, sort_order, config, redirect_path")
      .eq("signup_code", codeTrimmed)
      .order("sort_order", { ascending: true });

    if (!codeErr && codeRows?.length) {
      return codeRows as SignupActionRow[];
    }
    const { data: defaultRows, error: defaultErr } = await supabase
      .schema(schema)
      .from("signup_code_actions")
      .select("id, signup_code, action_type, sort_order, config, redirect_path")
      .is("signup_code", null)
      .order("sort_order", { ascending: true });

    if (defaultErr) {
      console.error("getSignupActions (default fallback) error:", defaultErr);
      return [];
    }
    return (defaultRows ?? []) as SignupActionRow[];
  }

  const { data, error } = await supabase
    .schema(schema)
    .from("signup_code_actions")
    .select("id, signup_code, action_type, sort_order, config, redirect_path")
    .is("signup_code", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getSignupActions (default) error:", error);
    return [];
  }
  return (data ?? []) as SignupActionRow[];
}

/** List all signup_code_actions for admin UI, ordered by signup_code (nulls last), then sort_order. */
export async function getAllSignupCodeActions(): Promise<SignupActionRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { data, error } = await supabase
    .schema(schema)
    .from("signup_code_actions")
    .select("id, signup_code, action_type, sort_order, config, redirect_path")
    .order("signup_code", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getAllSignupCodeActions error:", error);
    return [];
  }
  return (data ?? []) as SignupActionRow[];
}
