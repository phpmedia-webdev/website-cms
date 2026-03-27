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
  contact_id?: string | null;
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

/** JSONB may be object or stringified — used for `metadata.scope` and form fields in Message Center. */
export function parseTimelineMetadataJson(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

/**
 * Matches Message Center NOTE:SELF (`noteScope`) — metadata.scope and global `staff_note` heuristics.
 */
export function timelineRowIsNoteToSelfForViewer(
  row: Pick<
    ContactNotificationsTimelineRow,
    "contact_id" | "kind" | "metadata" | "author_user_id" | "recipient_user_id"
  >,
  viewerUserId: string | null | undefined
): boolean {
  const viewer = viewerUserId?.trim() ?? "";
  if (!viewer) return false;
  const cid = row.contact_id ?? "";
  const kindLower = (row.kind ?? "").trim().toLowerCase();
  const meta = parseTimelineMetadataJson(row.metadata);
  const scopeRaw = meta.scope ?? meta.note_scope;
  const scopeStr = typeof scopeRaw === "string" ? scopeRaw.trim().toLowerCase() : "";
  /** Global scratch only — contact-scoped rows stay NOTE even if metadata is wrong. */
  const fromMetadata = scopeStr === "note_to_self" && !cid.trim();
  const authorTrim = row.author_user_id?.trim() ?? "";
  const recipientTrim = row.recipient_user_id?.trim() ?? "";
  const isGlobalStaff = !cid.trim() && kindLower === "staff_note";
  const fromHeuristic =
    !fromMetadata &&
    isGlobalStaff &&
    !!authorTrim &&
    (authorTrim === recipientTrim || (authorTrim === viewer && !recipientTrim));
  return fromMetadata || fromHeuristic;
}

export async function getContactNotificationsTimelineRowById(
  id: string
): Promise<ContactNotificationsTimelineRow | null> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("contact_notifications_timeline")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getContactNotificationsTimelineRowById:", error.message);
    return null;
  }
  return (data as ContactNotificationsTimelineRow) ?? null;
}

export type DeleteGlobalSelfNoteResult =
  | { ok: true }
  | { ok: false; status: 404 | 403 | 500; message: string };

/**
 * Hard-delete a global NOTE:SELF row (audit entries are not deletable here). Only the author may delete.
 */
export async function deleteGlobalSelfNoteForAuthor(
  timelineId: string,
  authorUserId: string
): Promise<DeleteGlobalSelfNoteResult> {
  const aid = authorUserId.trim();
  if (!aid) return { ok: false, status: 403, message: "Forbidden" };
  const row = await getContactNotificationsTimelineRowById(timelineId);
  if (!row) return { ok: false, status: 404, message: "Not found" };
  if (row.contact_id != null && String(row.contact_id).trim() !== "") {
    return { ok: false, status: 403, message: "Only global scratch notes can be removed here" };
  }
  if (row.author_user_id?.trim() !== aid) {
    return { ok: false, status: 403, message: "You can only delete your own scratch notes" };
  }
  if (!timelineRowIsNoteToSelfForViewer(row, aid)) {
    return { ok: false, status: 403, message: "Not a deletable scratch note" };
  }
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { error } = await supabase
    .schema(schema)
    .from("contact_notifications_timeline")
    .delete()
    .eq("id", timelineId);
  if (error) {
    console.error("deleteGlobalSelfNoteForAuthor:", error.message);
    return { ok: false, status: 500, message: "Delete failed" };
  }
  return { ok: true };
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
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 500);
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

export type ContactNotificationsTimelineDateRange = {
  dateFrom?: string;
  dateTo?: string;
};

/**
 * Recent timeline rows for admin dashboard (all contacts + global rows).
 */
export async function listRecentContactNotificationsTimelineGlobal(
  limit: number,
  dateRange?: ContactNotificationsTimelineDateRange | null
): Promise<ContactNotificationsTimelineRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const hasRange = !!(dateRange?.dateFrom?.trim() || dateRange?.dateTo?.trim());
  const cap = Math.min(Math.max(limit, 1), 500);
  let q = supabase
    .schema(schema)
    .from("contact_notifications_timeline")
    .select("*");
  if (dateRange?.dateFrom) q = q.gte("created_at", dateRange.dateFrom);
  if (dateRange?.dateTo) q = q.lte("created_at", dateRange.dateTo);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(cap);
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
