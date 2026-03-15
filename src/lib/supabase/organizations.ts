/**
 * CRM organizations and contact–organization junction.
 * Uses same schema and service-role client as CRM; reads/writes via .schema().from().
 */

import { createServerSupabaseClient } from "./server-service";

const CRM_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface OrganizationRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactOrganizationRow {
  id: string;
  contact_id: string;
  organization_id: string;
  role: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactOrgWithOrg extends ContactOrganizationRow {
  organization: OrganizationRow | null;
}

export interface OrgWithMemberCount extends OrganizationRow {
  member_count?: number;
}

export interface OrgMemberPreview {
  id: string;
  full_name: string | null;
}

export interface OrgWithMemberPreview extends OrganizationRow {
  member_count?: number;
  members?: OrgMemberPreview[];
}

/** List all organizations (optional search). */
export async function listOrganizations(options?: {
  search?: string;
  schema?: string;
}): Promise<OrganizationRow[]> {
  const schema = options?.schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  let q = supabase
    .schema(schema)
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });
  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    q = q.ilike("name", term);
  }
  const { data, error } = await q;
  if (error) {
    const errMsg = (error as { message?: string; code?: string; details?: string }).message ?? (error as { code?: string }).code ?? String(error);
    console.error("listOrganizations:", errMsg, (error as { details?: string }).details);
    return [];
  }
  return (data ?? []) as OrganizationRow[];
}

/** List organizations with member count and member preview (first 5 per org) for list view. */
export async function listOrganizationsWithMemberCount(options?: {
  search?: string;
  schema?: string;
}): Promise<OrgWithMemberPreview[]> {
  const orgs = await listOrganizations(options);
  if (orgs.length === 0) {
    return [];
  }
  const schema = options?.schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data: links, error: linksError } = await supabase
    .schema(schema)
    .from("contact_organizations")
    .select("organization_id, contact_id, sort_order")
    .in(
      "organization_id",
      orgs.map((o) => o.id)
    )
    .order("sort_order", { ascending: true });
  if (linksError) {
    const errMsg = (linksError as { message?: string; code?: string }).message ?? (linksError as { code?: string }).code ?? String(linksError);
    console.error("listOrganizationsWithMemberCount (contact_organizations):", errMsg);
  }
  const byOrgIds: Record<string, string[]> = {};
  const byOrgCount: Record<string, number> = {};
  for (const r of links ?? []) {
    const row = r as { organization_id: string; contact_id: string };
    byOrgCount[row.organization_id] = (byOrgCount[row.organization_id] ?? 0) + 1;
    const list = byOrgIds[row.organization_id] ?? [];
    if (list.length < 5) list.push(row.contact_id);
    byOrgIds[row.organization_id] = list;
  }
  const allContactIds = [...new Set((links ?? []).map((r: { contact_id: string }) => r.contact_id))];
  let contactNames: Record<string, { full_name: string | null }> = {};
  if (allContactIds.length > 0) {
    const { data: contacts } = await supabase
      .schema(schema)
      .from("crm_contacts")
      .select("id, full_name")
      .in("id", allContactIds);
    contactNames = (contacts ?? []).reduce(
      (acc: Record<string, { full_name: string | null }>, c: { id: string; full_name: string | null }) => {
        acc[c.id] = { full_name: c.full_name };
        return acc;
      },
      {}
    );
  }
  return orgs.map((o) => {
    const memberIds = byOrgIds[o.id] ?? [];
    const members: OrgMemberPreview[] = memberIds.map((id) => ({
      id,
      full_name: contactNames[id]?.full_name ?? null,
    }));
    return {
      ...o,
      member_count: byOrgCount[o.id] ?? 0,
      members,
    };
  });
}

/** Get one organization by id. */
export async function getOrganizationById(
  id: string,
  schema?: string
): Promise<OrganizationRow | null> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as OrganizationRow;
}

/** Create organization. */
export async function createOrganization(
  params: {
    name: string;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    industry?: string | null;
  },
  schema?: string
): Promise<{ organization: OrganizationRow | null; error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("organizations")
    .insert({
      name: params.name.trim(),
      email: params.email?.trim() || null,
      phone: params.phone?.trim() || null,
      type: params.type?.trim() || null,
      industry: params.industry?.trim() || null,
    })
    .select()
    .single();
  if (error) return { organization: null, error };
  return { organization: data as OrganizationRow, error: null };
}

/** Update organization. */
export async function updateOrganization(
  id: string,
  params: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    industry?: string | null;
  },
  schema?: string
): Promise<{ organization: OrganizationRow | null; error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.name !== undefined) payload.name = params.name.trim();
  if (params.email !== undefined) payload.email = params.email?.trim() || null;
  if (params.phone !== undefined) payload.phone = params.phone?.trim() || null;
  if (params.type !== undefined) payload.type = params.type?.trim() || null;
  if (params.industry !== undefined)
    payload.industry = params.industry?.trim() || null;
  const { data, error } = await supabase
    .schema(schemaName)
    .from("organizations")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) return { organization: null, error };
  return { organization: data as OrganizationRow, error: null };
}

/** Delete organization. Junction rows removed by CASCADE. */
export async function deleteOrganization(
  id: string,
  schema?: string
): Promise<{ error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(schemaName)
    .from("organizations")
    .delete()
    .eq("id", id);
  return { error: error ?? null };
}

/** Get contact–organization links for a contact (ordered by sort_order, first = primary). */
export async function getContactOrganizations(
  contactId: string,
  schema?: string
): Promise<ContactOrgWithOrg[]> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data: links, error } = await supabase
    .schema(schemaName)
    .from("contact_organizations")
    .select("*, organization:organizations(*)")
    .eq("contact_id", contactId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("getContactOrganizations:", error);
    return [];
  }
  return (links ?? []).map((r: { organization?: OrganizationRow | null }) => ({
    ...r,
    organization: r.organization ?? null,
  })) as ContactOrgWithOrg[];
}

/** Get contacts linked to an organization (for org detail "related contacts"). */
export async function getContactsByOrganizationId(
  organizationId: string,
  schema?: string
): Promise<{ id: string; full_name: string | null; email: string | null }[]> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data: links, error } = await supabase
    .schema(schemaName)
    .from("contact_organizations")
    .select("contact_id")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });
  if (error || !links?.length) return [];
  const contactIds = links.map((r: { contact_id: string }) => r.contact_id);
  const { data: contacts } = await supabase
    .schema(schemaName)
    .from("crm_contacts")
    .select("id, full_name, email")
    .in("id", contactIds);
  const byId = (contacts ?? []).reduce(
    (acc: Record<string, { id: string; full_name: string | null; email: string | null }>, c: { id: string; full_name: string | null; email: string | null }) => {
      acc[c.id] = c;
      return acc;
    },
    {}
  );
  return contactIds.map((id: string) => byId[id] ?? { id, full_name: null, email: null });
}

/** Set contact's organizations (order = primary first). Replaces existing links. */
export async function setContactOrganizations(
  contactId: string,
  organizationIds: string[],
  schema?: string
): Promise<{ error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  await supabase
    .schema(schemaName)
    .from("contact_organizations")
    .delete()
    .eq("contact_id", contactId);
  if (organizationIds.length === 0) return { error: null };
  const rows = organizationIds.map((organization_id, i) => ({
    contact_id: contactId,
    organization_id,
    sort_order: i,
  }));
  const { error } = await supabase
    .schema(schemaName)
    .from("contact_organizations")
    .insert(rows);
  return { error: error ?? null };
}
