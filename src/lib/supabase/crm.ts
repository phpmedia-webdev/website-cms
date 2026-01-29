/**
 * CRM utilities: contacts, notes, custom fields, forms, form_submissions, MAGs.
 * Per prd-technical: read operations use RPC (not .from()); writes use .schema().from().
 * All CRM tables live in the tenant schema only. Schema name comes from NEXT_PUBLIC_CLIENT_SCHEMA;
 * each fork sets this to its own tenant schema (e.g. template dev uses website_cms_template_dev).
 */

import { createServerSupabaseClient } from "./client";
import { CRM_STATUS_SLUG_NEW } from "./settings";

const CRM_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Serialize Supabase/PostgREST error so message/code/details show in logs (avoids empty {}). */
function formatSupabaseError(err: unknown): string {
  if (err == null) return String(err);
  const o = err as Record<string, unknown>;
  const msg = o.message ?? (err instanceof Error ? err.message : "");
  const code = o.code ?? "";
  const details = o.details ?? "";
  const parts = [msg, code, details].filter(Boolean).map(String);
  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(err);
}

export interface CrmContact {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  status: string;
  dnd_status: string | null;
  source: string | null;
  form_id: string | null;
  external_crm_id: string | null;
  external_crm_synced_at: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmNote {
  id: string;
  contact_id: string;
  body: string;
  author_id: string | null;
  note_type: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  auto_assign_tags: string[] | null;
  auto_assign_mag_ids: string[] | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  contact_id: string | null;
  submitted_at: string;
  payload: Record<string, unknown>;
}

/** Single form–field assignment (core contact field or custom field). */
export interface FormFieldAssignment {
  id?: string;
  form_id?: string;
  field_source: "core" | "custom";
  core_field_key?: string | null;
  custom_field_id?: string | null;
  display_order: number;
  required: boolean;
}

/** Core (standard contact) fields that can be attached to a form. Key = column/key for storage. */
export const CORE_FORM_FIELDS: { key: string; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "full_name", label: "Full name" },
  { key: "company", label: "Company" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postal_code", label: "Postal code" },
  { key: "country", label: "Country" },
  { key: "message", label: "Message" },
];

export interface Mag {
  id: string;
  name: string;
  uid: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmCustomField {
  id: string;
  name: string;
  label: string;
  type: string;
  validation_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContactCustomFieldValue {
  id: string;
  contact_id: string;
  custom_field_id: string;
  custom_field_name: string;
  custom_field_label: string;
  custom_field_type: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMag {
  id: string;
  contact_id: string;
  mag_id: string;
  mag_name: string;
  mag_uid: string;
  assigned_via: string | null;
  assigned_at: string;
}

export interface MarketingList {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMarketingList {
  id: string;
  contact_id: string;
  list_id: string;
  list_name: string;
  list_slug: string;
  added_at: string;
}

export interface MagSearchResult {
  id: string;
  name: string;
  uid: string;
}

export interface MarketingListSearchResult {
  id: string;
  name: string;
  slug: string;
}

/** Get all contacts (RPC). */
export async function getContacts(): Promise<CrmContact[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contacts_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching contacts:", { message: error.message, code: error.code });
    return [];
  }
  return (data as CrmContact[]) || [];
}

/** Get one contact by id (RPC). */
export async function getContactById(id: string): Promise<CrmContact | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_by_id_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: id,
  });
  if (error) {
    console.error("Error fetching contact:", { message: error.message, code: error.code });
    return null;
  }
  const rows = (data as CrmContact[] | null) ?? [];
  return rows[0] ?? null;
}

/** Get one contact by email (direct read for form submit matching). */
export async function getContactByEmail(email: string | null | undefined): Promise<CrmContact | null> {
  if (!email || typeof email !== "string" || !email.trim()) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contacts")
    .select("*")
    .eq("email", email.trim())
    .maybeSingle();
  if (error) {
    console.error("Error fetching contact by email:", { message: error.message, code: error.code });
    return null;
  }
  return (data as CrmContact | null) ?? null;
}

/** Count contacts with status "New" (work-to-do indicator for sidebar badge). Status is stored as slug (e.g. "new"). */
export async function getNewContactsCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .ilike("status", CRM_STATUS_SLUG_NEW);
  if (error) {
    console.error("Error counting New contacts:", formatSupabaseError(error));
    return 0;
  }
  return typeof count === "number" ? count : 0;
}

/** Get form registry (RPC). */
export async function getForms(): Promise<Form[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_forms_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching forms:", formatSupabaseError(error));
    return [];
  }
  return (data as Form[]) || [];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Get one form by id or slug (for submit route). Uses slug when value is not a valid UUID. */
export async function getFormByIdOrSlug(idOrSlug: string): Promise<Form | null> {
  const supabase = createServerSupabaseClient();
  const byId = UUID_REGEX.test(idOrSlug.trim());
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .select("*")
    .eq(byId ? "id" : "slug", idOrSlug.trim())
    .maybeSingle();
  if (error) {
    console.error("Error fetching form:", formatSupabaseError(error));
    return null;
  }
  return (data as Form | null) ?? null;
}

/** Get field assignments for a form (RPC). */
export async function getFormFields(formId: string): Promise<FormFieldAssignment[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_form_fields_dynamic", {
    schema_name: CRM_SCHEMA,
    form_id_param: formId,
  });
  if (error) {
    console.error("Error fetching form fields:", formatSupabaseError(error));
    return [];
  }
  return (data as FormFieldAssignment[]) || [];
}

/** Get MAGs (RPC). */
export async function getMags(): Promise<Mag[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_mags_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching mags:", { message: error.message, code: error.code });
    return [];
  }
  return (data as Mag[]) || [];
}

/** Get notes for a contact (RPC). */
export async function getContactNotes(contactId: string): Promise<CrmNote[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_notes_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact notes:", { message: error.message, code: error.code });
    return [];
  }
  return (data as CrmNote[]) || [];
}

/** Get CRM custom field definitions (RPC). */
export async function getCrmCustomFields(): Promise<CrmCustomField[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_crm_custom_fields_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching CRM custom fields:", { message: error.message, code: error.code });
    return [];
  }
  return (data as CrmCustomField[]) || [];
}

/** Get custom field values for a contact (RPC). */
export async function getContactCustomFields(contactId: string): Promise<ContactCustomFieldValue[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_custom_fields_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact custom fields:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContactCustomFieldValue[]) || [];
}

/** Get MAGs assigned to a contact (RPC). */
export async function getContactMags(contactId: string): Promise<ContactMag[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_mags_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact MAGs:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContactMag[]) || [];
}

/** Get MAG-contact assignments for all contacts (for list view). */
export async function getAllContactMags(): Promise<{ contact_id: string; mag_id: string; mag_name: string }[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_mags")
    .select("contact_id, mag_id, mags(name)");
  if (error) {
    console.error("Error fetching all contact MAGs:", { message: error.message, code: error.code });
    return [];
  }
  return ((data as any[]) || []).map((r) => ({
    contact_id: r.contact_id,
    mag_id: r.mag_id,
    mag_name: r.mags?.name ?? "",
  }));
}

/** Get marketing list memberships for all contacts (for list view). */
export async function getAllContactMarketingLists(): Promise<{ contact_id: string; list_id: string; list_name: string }[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_marketing_lists")
    .select("contact_id, list_id, marketing_lists(name)");
  if (error) {
    console.error("Error fetching all contact marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return ((data as any[]) || []).map((r) => ({
    contact_id: r.contact_id,
    list_id: r.list_id,
    list_name: r.marketing_lists?.name ?? "",
  }));
}

/** Create a contact (write via .schema().from()). */
export async function createContact(
  payload: Partial<Omit<CrmContact, "id" | "created_at" | "updated_at">>
): Promise<{ contact: CrmContact | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contacts")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("Error creating contact:", { message: error.message, code: error.code });
    return { contact: null, error: new Error(error.message) };
  }
  return { contact: data as CrmContact, error: null };
}

/** Update a contact (write via .schema().from()). */
export async function updateContact(
  id: string,
  payload: Partial<Omit<CrmContact, "id" | "created_at" | "updated_at">>
): Promise<{ contact: CrmContact | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contacts")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating contact:", { message: error.message, code: error.code });
    return { contact: null, error: new Error(error.message) };
  }
  return { contact: data as CrmContact, error: null };
}

// ==================== Notes ====================

/** Create a note for a contact (write). */
export async function createNote(
  contactId: string,
  body: string,
  authorId?: string | null,
  noteType?: string | null
): Promise<{ note: CrmNote | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_notes")
    .insert({ contact_id: contactId, body, author_id: authorId ?? null, note_type: noteType ?? null })
    .select()
    .single();
  if (error) {
    console.error("Error creating note:", { message: error.message, code: error.code });
    return { note: null, error: new Error(error.message) };
  }
  return { note: data as CrmNote, error: null };
}

/** Update a note (write). */
export async function updateNote(
  noteId: string,
  body: string,
  noteType?: string | null
): Promise<{ note: CrmNote | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_notes")
    .update({ body, note_type: noteType ?? null, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();
  if (error) {
    console.error("Error updating note:", { message: error.message, code: error.code });
    return { note: null, error: new Error(error.message) };
  }
  return { note: data as CrmNote, error: null };
}

/** Delete a note (write). */
export async function deleteNote(noteId: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_notes")
    .delete()
    .eq("id", noteId);
  if (error) {
    console.error("Error deleting note:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

// ==================== MAGs ====================

/** Search MAGs by name/uid (RPC). */
export async function searchMags(searchTerm: string): Promise<MagSearchResult[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_mags_dynamic", {
    schema_name: CRM_SCHEMA,
    search_term: searchTerm,
  });
  if (error) {
    console.error("Error searching MAGs:", { message: error.message, code: error.code });
    return [];
  }
  return (data as MagSearchResult[]) || [];
}

/** Add contact to MAG (write). */
export async function addContactToMag(
  contactId: string,
  magId: string,
  assignedVia?: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_mags")
    .insert({ contact_id: contactId, mag_id: magId, assigned_via: assignedVia ?? null });
  if (error) {
    console.error("Error adding contact to MAG:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Remove contact from MAG (write). */
export async function removeContactFromMag(
  contactId: string,
  magId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_mags")
    .delete()
    .eq("contact_id", contactId)
    .eq("mag_id", magId);
  if (error) {
    console.error("Error removing contact from MAG:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

// ==================== Marketing Lists ====================

/** Get all marketing lists (RPC). */
export async function getMarketingLists(): Promise<MarketingList[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_marketing_lists_dynamic", {
    schema_name: CRM_SCHEMA,
  });
  if (error) {
    console.error("Error fetching marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return (data as MarketingList[]) || [];
}

/** Get marketing lists a contact belongs to (RPC). */
export async function getContactMarketingLists(contactId: string): Promise<ContactMarketingList[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_contact_marketing_lists_dynamic", {
    schema_name: CRM_SCHEMA,
    contact_id_param: contactId,
  });
  if (error) {
    console.error("Error fetching contact marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContactMarketingList[]) || [];
}

/** Search marketing lists by name/slug (RPC). */
export async function searchMarketingLists(searchTerm: string): Promise<MarketingListSearchResult[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_marketing_lists_dynamic", {
    schema_name: CRM_SCHEMA,
    search_term: searchTerm,
  });
  if (error) {
    console.error("Error searching marketing lists:", { message: error.message, code: error.code });
    return [];
  }
  return (data as MarketingListSearchResult[]) || [];
}

/** Add contact to marketing list (write). */
export async function addContactToMarketingList(
  contactId: string,
  listId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_marketing_lists")
    .insert({ contact_id: contactId, list_id: listId });
  if (error) {
    console.error("Error adding contact to marketing list:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Remove contact from marketing list (write). */
export async function removeContactFromMarketingList(
  contactId: string,
  listId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_marketing_lists")
    .delete()
    .eq("contact_id", contactId)
    .eq("list_id", listId);
  if (error) {
    console.error("Error removing contact from marketing list:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Create a marketing list (write). */
export async function createMarketingList(
  payload: { name: string; slug: string; description?: string | null }
): Promise<{ list: MarketingList | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("marketing_lists")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("Error creating marketing list:", { message: error.message, code: error.code });
    return { list: null, error: new Error(error.message) };
  }
  return { list: data as MarketingList, error: null };
}

// ==================== Custom field definitions ====================

/** Create a CRM custom field definition (write). */
export async function createCrmCustomField(
  payload: { name: string; label: string; type: string; validation_rules?: Record<string, unknown> }
): Promise<{ field: CrmCustomField | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_custom_fields")
    .insert({
      name: payload.name,
      label: payload.label,
      type: payload.type,
      validation_rules: payload.validation_rules ?? {},
    })
    .select()
    .single();
  if (error) {
    console.error("Error creating CRM custom field:", { message: error.message, code: error.code });
    return { field: null, error: new Error(error.message) };
  }
  return { field: data as CrmCustomField, error: null };
}

/** Update a CRM custom field definition (write). */
export async function updateCrmCustomField(
  id: string,
  payload: Partial<{ name: string; label: string; type: string; validation_rules: Record<string, unknown> }>
): Promise<{ field: CrmCustomField | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_custom_fields")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating CRM custom field:", { message: error.message, code: error.code });
    return { field: null, error: new Error(error.message) };
  }
  return { field: data as CrmCustomField, error: null };
}

/** Delete a CRM custom field definition (write). Cascades to contact values. */
export async function deleteCrmCustomField(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_custom_fields")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting CRM custom field:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Set or update one custom field value for a contact (upsert). Used by form submit. */
export async function upsertContactCustomFieldValue(
  contactId: string,
  customFieldId: string,
  value: string | null
): Promise<{ error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("crm_contact_custom_fields")
    .upsert(
      { contact_id: contactId, custom_field_id: customFieldId, value: value ?? null },
      { onConflict: "contact_id,custom_field_id" }
    );
  if (error) {
    console.error("Error upserting contact custom field:", { message: error.message, code: error.code });
    return { error: new Error(error.message) };
  }
  return { error: null };
}

// ==================== Form registry ====================

/** Create a form definition (write). */
export async function createForm(
  payload: {
    name: string;
    slug: string;
    auto_assign_tags?: string[] | null;
    auto_assign_mag_ids?: string[] | null;
    settings?: Record<string, unknown>;
  }
): Promise<{ form: Form | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .insert({
      name: payload.name,
      slug: payload.slug,
      auto_assign_tags: payload.auto_assign_tags ?? null,
      auto_assign_mag_ids: payload.auto_assign_mag_ids ?? null,
      settings: payload.settings ?? {},
      // Legacy column: some schemas have forms.fields NOT NULL; we use form_fields table instead.
      fields: [],
    })
    .select()
    .single();
  if (error) {
    console.error("Error creating form:", { message: error.message, code: error.code });
    return { form: null, error: new Error(error.message) };
  }
  return { form: data as Form, error: null };
}

/** Replace all field assignments for a form (write). */
export async function setFormFields(
  formId: string,
  fields: Array<{
    field_source: "core" | "custom";
    core_field_key?: string | null;
    custom_field_id?: string | null;
    display_order: number;
    required: boolean;
  }>
): Promise<{ error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error: delError } = await supabase
    .schema(CRM_SCHEMA)
    .from("form_fields")
    .delete()
    .eq("form_id", formId);
  if (delError) {
    console.error("Error clearing form fields:", { message: delError.message, code: delError.code });
    return { error: new Error(delError.message) };
  }
  if (fields.length === 0) return { error: null };
  const rows = fields.map((f) => ({
    form_id: formId,
    field_source: f.field_source,
    core_field_key: f.field_source === "core" ? f.core_field_key ?? null : null,
    custom_field_id: f.field_source === "custom" ? f.custom_field_id ?? null : null,
    display_order: f.display_order,
    required: f.required ?? false,
  }));
  const { error: insError } = await supabase
    .schema(CRM_SCHEMA)
    .from("form_fields")
    .insert(rows);
  if (insError) {
    console.error("Error inserting form fields:", { message: insError.message, code: insError.code });
    return { error: new Error(insError.message) };
  }
  return { error: null };
}

/** Update a form definition (write). Optionally replace field_assignments. */
export async function updateForm(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    auto_assign_tags: string[] | null;
    auto_assign_mag_ids: string[] | null;
    settings: Record<string, unknown>;
    field_assignments: Array<{
      field_source: "core" | "custom";
      core_field_key?: string | null;
      custom_field_id?: string | null;
      display_order: number;
      required: boolean;
    }>;
  }>
): Promise<{ form: Form | null; error: Error | null }> {
  const { field_assignments, ...formPayload } = payload;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .update({ ...formPayload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating form:", { message: error.message, code: error.code });
    return { form: null, error: new Error(error.message) };
  }
  if (field_assignments !== undefined) {
    const { error: fieldsError } = await setFormFields(id, field_assignments);
    if (fieldsError) return { form: null, error: fieldsError };
  }
  return { form: data as Form, error: null };
}

/** Delete a form definition (write). Contacts referencing it get form_id set to null. */
export async function deleteForm(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .schema(CRM_SCHEMA)
    .from("forms")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting form:", { message: error.message, code: error.code });
    return { success: false, error: new Error(error.message) };
  }
  return { success: true, error: null };
}

/** Insert a form submission (write). Used by POST /api/forms/[formId]/submit. Tenant schema only. */
export async function insertFormSubmission(
  formId: string,
  payload: Record<string, unknown>,
  contactId?: string | null
): Promise<{ submission: FormSubmission | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const payloadValue = payload ?? {};
  const baseRow = {
    form_id: formId,
    contact_id: contactId ?? null,
    payload: payloadValue,
  };
  const withData = { ...baseRow, data: payloadValue };

  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("form_submissions")
    .insert(withData)
    .select()
    .single();
  if (error) {
    const isMissingDataColumn =
      error.code === "42703" || /column "data" does not exist/i.test(error.message ?? "");
    if (isMissingDataColumn) {
      const { data: data2, error: error2 } = await supabase
        .schema(CRM_SCHEMA)
        .from("form_submissions")
        .insert(baseRow)
        .select()
        .single();
      if (error2) {
        console.error("Error inserting form submission:", formatSupabaseError(error2));
        return { submission: null, error: new Error(error2.message) };
      }
      return { submission: data2 as FormSubmission, error: null };
    }
    console.error("Error inserting form submission:", formatSupabaseError(error));
    return { submission: null, error: new Error(error.message) };
  }
  return { submission: data as FormSubmission, error: null };
}

function normalizeSubmissionRow(row: Record<string, unknown>): FormSubmission {
  return {
    id: row.id as string,
    form_id: row.form_id as string,
    contact_id: (row.contact_id as string | null) ?? null,
    submitted_at: (row.submitted_at ?? row.created_at) as string,
    payload: (row.payload ?? row.data ?? {}) as Record<string, unknown>,
  };
}

/** List submissions for a form (direct read). Tenant schema only. */
export async function getFormSubmissions(formId: string): Promise<FormSubmission[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CRM_SCHEMA)
    .from("form_submissions")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });
  if (error) {
    console.error("Error fetching form submissions:", formatSupabaseError(error));
    return [];
  }
  const rows = (data as Record<string, unknown>[] | null) ?? [];
  return rows.map(normalizeSubmissionRow);
}
