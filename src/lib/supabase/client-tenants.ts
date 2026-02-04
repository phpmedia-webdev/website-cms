/**
 * Client/tenant registry (public.client_tenants). Superadmin only.
 * Caller must enforce superadmin access for all operations.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import type {
  ClientTenant,
  ClientTenantInsert,
  ClientTenantUpdate,
} from "@/types/client-tenants";

export async function listClientTenants(status?: string | null): Promise<ClientTenant[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase
    .from("client_tenants")
    .select("*")
    .order("name", { ascending: true });
  if (status?.trim()) {
    q = q.eq("status", status.trim());
  }
  const { data, error } = await q;
  if (error) {
    console.error("listClientTenants:", error);
    return [];
  }
  return (data as ClientTenant[]) ?? [];
}

export async function getClientTenantById(id: string): Promise<ClientTenant | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("client_tenants")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as ClientTenant;
}

export async function getClientTenantBySchema(schemaName: string): Promise<ClientTenant | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("client_tenants")
    .select("*")
    .eq("schema_name", schemaName)
    .single();
  if (error || !data) return null;
  return data as ClientTenant;
}

export async function createClientTenant(row: ClientTenantInsert): Promise<ClientTenant | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("client_tenants")
    .insert({
      name: row.name.trim(),
      slug: row.slug.trim(),
      schema_name: row.schema_name.trim(),
      deployment_url: row.deployment_url?.trim() || null,
      description: row.description?.trim() || null,
      status: row.status?.trim() || "active",
      site_mode: row.site_mode?.trim() || "coming_soon",
      github_repo: row.github_repo?.trim() || null,
      notes: row.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) {
    console.error("createClientTenant:", error);
    return null;
  }
  return data as ClientTenant;
}

export async function updateClientTenant(
  id: string,
  row: ClientTenantUpdate
): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (row.name !== undefined) payload.name = row.name.trim();
  if (row.slug !== undefined) payload.slug = row.slug.trim();
  if (row.schema_name !== undefined) payload.schema_name = row.schema_name.trim();
  if (row.deployment_url !== undefined) payload.deployment_url = row.deployment_url?.trim() || null;
  if (row.description !== undefined) payload.description = row.description?.trim() || null;
  if (row.status !== undefined) payload.status = row.status?.trim();
  if (row.site_mode !== undefined) payload.site_mode = row.site_mode?.trim();
  if (row.site_mode_locked !== undefined) payload.site_mode_locked = row.site_mode_locked;
  if (row.site_mode_locked_by !== undefined) payload.site_mode_locked_by = row.site_mode_locked_by;
  if (row.site_mode_locked_at !== undefined) payload.site_mode_locked_at = row.site_mode_locked_at;
  if (row.site_mode_locked_reason !== undefined) payload.site_mode_locked_reason = row.site_mode_locked_reason?.trim() || null;
  if (row.github_repo !== undefined) payload.github_repo = row.github_repo?.trim() || null;
  if (row.notes !== undefined) payload.notes = row.notes?.trim() || null;
  if (Object.keys(payload).length === 0) return true;
  const { error } = await supabase.from("client_tenants").update(payload).eq("id", id);
  if (error) {
    console.error("updateClientTenant:", error);
    return false;
  }
  return true;
}
