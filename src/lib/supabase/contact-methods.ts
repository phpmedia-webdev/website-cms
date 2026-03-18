/**
 * CRM contact methods: normalized phone/email rows for matching and multi-value storage.
 */

import { createServerSupabaseClient } from "./server-service";

const CRM_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export type ContactMethodType = "phone" | "email";

export interface ContactMethodRow {
  id: string;
  contact_id: string;
  method_type: ContactMethodType;
  label: string;
  value: string;
  normalized_value: string;
  is_primary: boolean;
  sort_order: number;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMethodInput {
  method_type: ContactMethodType;
  label?: string | null;
  value: string;
  is_primary?: boolean;
  sort_order?: number;
  source?: string | null;
}

interface ContactMethodInsertRow {
  contact_id: string;
  method_type: ContactMethodType;
  label: string;
  value: string;
  normalized_value: string;
  is_primary: boolean;
  sort_order: number;
  source: string | null;
}

export function normalizeContactMethodValue(methodType: ContactMethodType, value: string): string {
  const trimmed = value.trim();
  if (methodType === "email") {
    return trimmed.toLowerCase();
  }
  return trimmed.replace(/\D+/g, "");
}

export function isContactMethodValueValid(methodType: ContactMethodType, value: string): boolean {
  const normalized = normalizeContactMethodValue(methodType, value);
  return normalized.length > 0;
}

export async function listContactMethods(contactId: string, schema?: string): Promise<ContactMethodRow[]> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(schemaName)
    .from("contact_methods")
    .select("*")
    .eq("contact_id", contactId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listContactMethods:", error);
    return [];
  }
  return (data ?? []) as ContactMethodRow[];
}

export async function addContactMethod(
  contactId: string,
  input: ContactMethodInput,
  schema?: string
): Promise<{ method: ContactMethodRow | null; error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const value = input.value.trim();
  const normalized_value = normalizeContactMethodValue(input.method_type, value);
  if (!value || !normalized_value) {
    return { method: null, error: new Error("Contact method value is required") };
  }
  const { data, error } = await supabase
    .schema(schemaName)
    .from("contact_methods")
    .insert({
      contact_id: contactId,
      method_type: input.method_type,
      label: input.label?.trim() || "main",
      value,
      normalized_value,
      is_primary: !!input.is_primary,
      sort_order: input.sort_order ?? 0,
      source: input.source?.trim() || null,
    })
    .select()
    .single();
  if (error) return { method: null, error };
  return { method: data as ContactMethodRow, error: null };
}

export async function replaceContactMethods(
  contactId: string,
  methods: ContactMethodInput[],
  schema?: string
): Promise<{ error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  await supabase.schema(schemaName).from("contact_methods").delete().eq("contact_id", contactId);
  if (methods.length === 0) {
    return { error: null };
  }
  const rows = methods
    .map((method, index) => {
      const value = method.value.trim();
      const normalized_value = normalizeContactMethodValue(method.method_type, value);
      if (!value || !normalized_value) return null;
      return {
        contact_id: contactId,
        method_type: method.method_type,
        label: method.label?.trim() || "main",
        value,
        normalized_value,
        is_primary: !!method.is_primary,
        sort_order: method.sort_order ?? index,
        source: method.source?.trim() || null,
      };
    })
    .filter((row): row is ContactMethodInsertRow => row != null);
  if (rows.length === 0) {
    return { error: null };
  }
  const { error } = await supabase.schema(schemaName).from("contact_methods").insert(rows);
  return { error: error ?? null };
}

export async function deleteContactMethod(
  methodId: string,
  schema?: string
): Promise<{ error: Error | null }> {
  const schemaName = schema ?? CRM_SCHEMA;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.schema(schemaName).from("contact_methods").delete().eq("id", methodId);
  return { error: error ?? null };
}
