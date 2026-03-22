/**
 * Phase 18C — contact-scoped notifications timeline (`contact_notifications_timeline`).
 * Writes/reads via service-role client; API routes must enforce auth. See migration 190.
 */

import { createServerSupabaseClient } from "./server-service";
import { getClientSchema } from "./schema";

export type ContactNotificationsVisibility = "admin_only" | "client_visible" | "both";

export interface ContactNotificationsTimelineRow {
  id: string;
  contact_id: string | null;
  kind: string;
  visibility: ContactNotificationsVisibility;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  author_user_id: string | null;
  recipient_user_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  source_event: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface InsertContactNotificationsTimelineInput {
  contact_id: string;
  kind: string;
  visibility: ContactNotificationsVisibility;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  author_user_id?: string | null;
  recipient_user_id?: string | null;
  subject_type?: string | null;
  subject_id?: string | null;
  source_event?: string | null;
}

const VISIBILITY_SET = new Set<ContactNotificationsVisibility>([
  "admin_only",
  "client_visible",
  "both",
]);

export function isValidVisibility(v: string): v is ContactNotificationsVisibility {
  return VISIBILITY_SET.has(v as ContactNotificationsVisibility);
}

/**
 * List timeline rows for a CRM contact, newest first.
 */
export async function listContactNotificationsTimeline(
  contactId: string,
  options?: { limit?: number; kinds?: string[] }
): Promise<ContactNotificationsTimelineRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  let q = supabase
    .schema(schema)
    .from("contact_notifications_timeline")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.kinds?.length) {
    q = q.in("kind", options.kinds);
  }
  const { data, error } = await q;
  if (error) {
    console.error("listContactNotificationsTimeline:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ContactNotificationsTimelineRow[];
}

/**
 * Recent timeline rows across all contacts (admin dashboard). Only rows with `contact_id` set.
 */
export async function listRecentContactNotificationsTimelineGlobal(
  limit: number
): Promise<ContactNotificationsTimelineRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const cap = Math.min(Math.max(limit, 1), 150);
  const { data, error } = await supabase
    .schema(schema)
    .from("contact_notifications_timeline")
    .select("*")
    .not("contact_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (error) {
    console.error("listRecentContactNotificationsTimelineGlobal:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ContactNotificationsTimelineRow[];
}

/**
 * Insert one timeline row (e.g. staff_note, system event). Returns row or error.
 */
export async function insertContactNotificationsTimeline(
  input: InsertContactNotificationsTimelineInput
): Promise<{ row: ContactNotificationsTimelineRow | null; error: Error | null }> {
  if (!input.kind?.trim()) {
    return { row: null, error: new Error("kind is required") };
  }
  if (!isValidVisibility(input.visibility)) {
    return { row: null, error: new Error("invalid visibility") };
  }
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const payload = {
    contact_id: input.contact_id,
    kind: input.kind.trim(),
    visibility: input.visibility,
    title: input.title ?? "",
    body: input.body ?? null,
    metadata: input.metadata ?? {},
    author_user_id: input.author_user_id ?? null,
    recipient_user_id: input.recipient_user_id ?? null,
    subject_type: input.subject_type ?? null,
    subject_id: input.subject_id ?? null,
    source_event: input.source_event ?? null,
  };
  const { data, error } = await supabase
    .schema(schema)
    .from("contact_notifications_timeline")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("insertContactNotificationsTimeline:", error.message, error.code);
    return { row: null, error: new Error(error.message) };
  }
  return { row: data as ContactNotificationsTimelineRow, error: null };
}
