/**
 * Superadmin code snippets: CRUD for public.code_snippets.
 * Used by /admin/super/code-snippets (API routes and server components). Caller must enforce superadmin access.
 * Uses server client so it works in API routes and Server Components; table is in public schema.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import type { CodeSnippet, CodeSnippetInsert, CodeSnippetUpdate } from "@/types/code-snippets";

export async function listCodeSnippets(typeFilter?: string | null): Promise<CodeSnippet[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase.from("code_snippets").select("*").order("updated_at", { ascending: false });
  if (typeFilter && typeFilter.trim()) {
    q = q.eq("type", typeFilter.trim());
  }
  const { data, error } = await q;
  if (error) {
    console.error("listCodeSnippets:", error);
    return [];
  }
  return (data as CodeSnippet[]) ?? [];
}

export async function getCodeSnippetById(id: string): Promise<CodeSnippet | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("code_snippets").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as CodeSnippet;
}

export async function createCodeSnippet(row: CodeSnippetInsert): Promise<CodeSnippet | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("code_snippets")
    .insert({
      title: row.title.trim(),
      type: row.type?.trim() || null,
      description: row.description?.trim() || null,
      code: row.code,
    })
    .select()
    .single();
  if (error) {
    console.error("createCodeSnippet:", error);
    return null;
  }
  return data as CodeSnippet;
}

export async function updateCodeSnippet(id: string, row: CodeSnippetUpdate): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (row.title !== undefined) payload.title = row.title.trim();
  if (row.type !== undefined) payload.type = row.type?.trim() || null;
  if (row.description !== undefined) payload.description = row.description?.trim() || null;
  if (row.code !== undefined) payload.code = row.code;
  if (Object.keys(payload).length === 0) return true;
  const { error } = await supabase.from("code_snippets").update(payload).eq("id", id);
  if (error) {
    console.error("updateCodeSnippet:", error);
    return false;
  }
  return true;
}

export async function deleteCodeSnippet(id: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("code_snippets").delete().eq("id", id);
  if (error) {
    console.error("deleteCodeSnippet:", error);
    return false;
  }
  return true;
}
