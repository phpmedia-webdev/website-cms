/**
 * Phase 18C — threaded messages (`conversation_threads`, `thread_messages`, `thread_participants`).
 * Service-role access from server; routes enforce auth. See migration 191.
 */

import { createServerSupabaseClient } from "./server-service";
import { getClientSchema } from "./schema";

/** Matches DB CHECK on conversation_threads.thread_type */
export type ConversationThreadType =
  | "support"
  | "task_ticket"
  | "blog_comment"
  | "product_comment"
  | "direct"
  | "mag_group"
  | "group";

const THREAD_TYPES = new Set<string>([
  "support",
  "task_ticket",
  "blog_comment",
  "product_comment",
  "direct",
  "mag_group",
  "group",
]);

export function isValidThreadType(t: string): t is ConversationThreadType {
  return THREAD_TYPES.has(t);
}

export interface ConversationThreadRow {
  id: string;
  thread_type: ConversationThreadType;
  mag_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadMessageRow {
  id: string;
  thread_id: string;
  body: string;
  author_user_id: string | null;
  author_contact_id: string | null;
  metadata: Record<string, unknown>;
  parent_message_id: string | null;
  created_at: string;
  edited_at: string | null;
}

export interface CreateConversationThreadInput {
  thread_type: ConversationThreadType;
  mag_id?: string | null;
  subject_type?: string | null;
  subject_id?: string | null;
}

export interface InsertThreadMessageInput {
  thread_id: string;
  body: string;
  author_user_id?: string | null;
  author_contact_id?: string | null;
  metadata?: Record<string, unknown>;
  parent_message_id?: string | null;
}

export async function createConversationThread(
  input: CreateConversationThreadInput
): Promise<{ thread: ConversationThreadRow | null; error: Error | null }> {
  if (!isValidThreadType(input.thread_type)) {
    return { thread: null, error: new Error("invalid thread_type") };
  }
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const payload = {
    thread_type: input.thread_type,
    mag_id: input.mag_id ?? null,
    subject_type: input.subject_type ?? null,
    subject_id: input.subject_id ?? null,
  };
  const { data, error } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("createConversationThread:", error.message, error.code);
    return { thread: null, error: new Error(error.message) };
  }
  return { thread: data as ConversationThreadRow, error: null };
}

export async function insertThreadMessage(
  input: InsertThreadMessageInput
): Promise<{ message: ThreadMessageRow | null; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const payload = {
    thread_id: input.thread_id,
    body: input.body ?? "",
    author_user_id: input.author_user_id ?? null,
    author_contact_id: input.author_contact_id ?? null,
    metadata: input.metadata ?? {},
    parent_message_id: input.parent_message_id ?? null,
  };
  const { data, error } = await supabase
    .schema(schema)
    .from("thread_messages")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("insertThreadMessage:", error.message, error.code);
    return { message: null, error: new Error(error.message) };
  }
  await supabase
    .schema(schema)
    .from("conversation_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.thread_id);
  return { message: data as ThreadMessageRow, error: null };
}

/**
 * List messages in a thread, oldest first (chat order).
 */
export async function listThreadMessages(
  threadId: string,
  options?: { limit?: number }
): Promise<ThreadMessageRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
  const { data, error } = await supabase
    .schema(schema)
    .from("thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("listThreadMessages:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ThreadMessageRow[];
}

export interface ThreadParticipantRow {
  id: string;
  thread_id: string;
  user_id: string | null;
  contact_id: string | null;
  last_read_at: string | null;
  role: string | null;
  created_at: string;
}

export async function addThreadParticipant(input: {
  thread_id: string;
  user_id?: string | null;
  contact_id?: string | null;
  role?: string | null;
}): Promise<{ participant: ThreadParticipantRow | null; error: Error | null }> {
  if (!input.user_id && !input.contact_id) {
    return { participant: null, error: new Error("user_id or contact_id required") };
  }
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("thread_participants")
    .insert({
      thread_id: input.thread_id,
      user_id: input.user_id ?? null,
      contact_id: input.contact_id ?? null,
      role: input.role ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("addThreadParticipant:", error.message, error.code);
    return { participant: null, error: new Error(error.message) };
  }
  return { participant: data as ThreadParticipantRow, error: null };
}

/** Insert participant if not already present (unique thread+user). Swallows duplicate errors. */
export async function addThreadParticipantIfNotExists(input: {
  thread_id: string;
  user_id?: string | null;
  contact_id?: string | null;
  role?: string | null;
}): Promise<void> {
  const { error } = await addThreadParticipant(input);
  if (!error) return;
  const msg = error.message.toLowerCase();
  if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
    return;
  }
  console.error("addThreadParticipantIfNotExists:", error.message);
}

/**
 * One canonical MAG group room per membership group (newest row if duplicates exist).
 */
export async function getOrCreateMagGroupThread(
  magId: string
): Promise<{ thread: ConversationThreadRow | null; error: Error | null }> {
  const mid = magId.trim();
  if (!mid) {
    return { thread: null, error: new Error("mag_id required") };
  }
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: existing, error: selErr } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("*")
    .eq("thread_type", "mag_group")
    .eq("mag_id", mid)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (selErr) {
    console.error("getOrCreateMagGroupThread select:", selErr.message);
    return { thread: null, error: new Error(selErr.message) };
  }
  const first = (existing ?? [])[0] as ConversationThreadRow | undefined;
  if (first) {
    return { thread: first, error: null };
  }
  return createConversationThread({ thread_type: "mag_group", mag_id: mid });
}

export type MagGroupStaffMessagePreview = {
  id: string;
  thread_id: string;
  mag_id: string;
  body: string;
  created_at: string;
};

/**
 * Recent staff posts in MAG group threads (for member activity). `author_contact_id` null = staff.
 */
export async function listRecentStaffMagGroupMessagesForMagIds(
  magIds: string[],
  limitTotal: number
): Promise<MagGroupStaffMessagePreview[]> {
  const ids = [...new Set(magIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0 || limitTotal < 1) return [];
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: threads, error: tErr } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("id, mag_id")
    .eq("thread_type", "mag_group")
    .in("mag_id", ids);
  if (tErr) {
    console.error("listRecentStaffMagGroupMessagesForMagIds threads:", tErr.message);
    return [];
  }
  const threadRows = (threads ?? []) as { id: string; mag_id: string }[];
  if (threadRows.length === 0) return [];
  const magByThread = new Map(threadRows.map((t) => [t.id, t.mag_id]));
  const threadIdList = threadRows.map((t) => t.id);
  const { data: msgs, error: mErr } = await supabase
    .schema(schema)
    .from("thread_messages")
    .select("id, thread_id, body, created_at, author_user_id, author_contact_id")
    .in("thread_id", threadIdList)
    .is("author_contact_id", null)
    .not("author_user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limitTotal, 1), 400));
  if (mErr) {
    console.error("listRecentStaffMagGroupMessagesForMagIds messages:", mErr.message);
    return [];
  }
  const out: MagGroupStaffMessagePreview[] = [];
  for (const m of (msgs ?? []) as {
    id: string;
    thread_id: string;
    body: string;
    created_at: string;
  }[]) {
    const magId = magByThread.get(m.thread_id);
    if (!magId) continue;
    out.push({
      id: m.id,
      thread_id: m.thread_id,
      mag_id: magId,
      body: m.body ?? "",
      created_at: m.created_at,
    });
  }
  return out;
}

/** Canonical `mag_group` thread rows for the given MAG ids (newest first per query order). */
export async function listMagGroupThreadsForMagIds(magIds: string[]): Promise<ConversationThreadRow[]> {
  const ids = [...new Set(magIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("*")
    .eq("thread_type", "mag_group")
    .in("mag_id", ids)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("listMagGroupThreadsForMagIds:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ConversationThreadRow[];
}

export async function getConversationThreadById(
  threadId: string
): Promise<ConversationThreadRow | null> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) {
    console.error("getConversationThreadById:", error.message, error.code);
    return null;
  }
  return (data as ConversationThreadRow) ?? null;
}

/**
 * Support threads for one CRM contact (GPUM inbox). Ensures contact card Message Center
 * is not empty when this thread is outside the global “recent threads” cap.
 *
 * Includes threads found via `subject_id`, plus recovery: support threads where the contact
 * authored `thread_messages` but `subject_id` was wrong/null (legacy / race data).
 */
export async function listSupportThreadsForContact(contactId: string): Promise<ConversationThreadRow[]> {
  const cid = contactId.trim();
  if (!cid) return [];
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const byId = new Map<string, ConversationThreadRow>();

  const { data: directRows, error: directErr } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("*")
    .eq("thread_type", "support")
    .eq("subject_type", "contact_support")
    .eq("subject_id", cid)
    .order("updated_at", { ascending: false });
  if (directErr) {
    console.error("listSupportThreadsForContact direct:", directErr.message, directErr.code);
  }
  for (const row of (directRows ?? []) as ConversationThreadRow[]) {
    byId.set(row.id, row);
  }

  const { data: msgRows, error: msgErr } = await supabase
    .schema(schema)
    .from("thread_messages")
    .select("thread_id")
    .eq("author_contact_id", cid)
    .limit(400);
  if (msgErr) {
    console.error("listSupportThreadsForContact messages:", msgErr.message, msgErr.code);
  }
  const fromMessages = [
    ...new Set(
      ((msgRows ?? []) as { thread_id: string | null }[])
        .map((r) => r.thread_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ].filter((tid) => !byId.has(tid));

  if (fromMessages.length > 0) {
    const { data: orphanThreads, error: orphanErr } = await supabase
      .schema(schema)
      .from("conversation_threads")
      .select("*")
      .in("id", fromMessages)
      .eq("thread_type", "support");
    if (orphanErr) {
      console.error("listSupportThreadsForContact orphan:", orphanErr.message, orphanErr.code);
    } else {
      for (const row of (orphanThreads ?? []) as ConversationThreadRow[]) {
        byId.set(row.id, row);
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

/** Task-ticket threads for given task ids (contact-scoped admin stream). */
export async function listTaskTicketThreadsForTaskIds(taskIds: string[]): Promise<ConversationThreadRow[]> {
  const ids = [...new Set(taskIds.filter((id) => typeof id === "string" && id.trim()))];
  if (ids.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("*")
    .eq("thread_type", "task_ticket")
    .eq("subject_type", "task")
    .in("subject_id", ids)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("listTaskTicketThreadsForTaskIds:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ConversationThreadRow[];
}

/** Recent thread heads for admin Message Center (all types). */
export async function listRecentConversationThreadsForAdmin(
  limit: number,
  dateRange?: { dateFrom?: string; dateTo?: string } | null
): Promise<ConversationThreadRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const hasRange = !!(dateRange?.dateFrom?.trim() || dateRange?.dateTo?.trim());
  const cap = Math.min(Math.max(limit, 1), hasRange ? 500 : 500);
  let q = supabase.schema(schema).from("conversation_threads").select("*");
  if (dateRange?.dateFrom) q = q.gte("updated_at", dateRange.dateFrom);
  if (dateRange?.dateTo) q = q.lte("updated_at", dateRange.dateTo);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(cap);
  if (error) {
    console.error("listRecentConversationThreadsForAdmin:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ConversationThreadRow[];
}

export interface ThreadLastMessagePreview {
  thread_id: string;
  body: string;
  created_at: string;
  author_user_id: string | null;
  author_contact_id: string | null;
}

/** Latest message per thread (one round-trip per thread chunk; correct for any depth). */
export async function fetchLatestThreadMessagesForThreads(
  threadIds: string[]
): Promise<Map<string, ThreadLastMessagePreview>> {
  const result = new Map<string, ThreadLastMessagePreview>();
  if (threadIds.length === 0) return result;
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  await Promise.all(
    threadIds.map(async (tid) => {
      const { data, error } = await supabase
        .schema(schema)
        .from("thread_messages")
        .select("thread_id, body, created_at, author_user_id, author_contact_id")
        .eq("thread_id", tid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("fetchLatestThreadMessagesForThreads:", tid, error.message);
        return;
      }
      if (data) {
        result.set(tid, data as ThreadLastMessagePreview);
      }
    })
  );
  return result;
}

/**
 * Recent messages across MAG group threads for admin Message Center.
 * Used to show one timeline row per post instead of a single “thread head” rollup
 * whose preview always reflects only the latest message.
 */
export async function listRecentMagGroupThreadMessagesForStream(
  threadIds: string[],
  options?: {
    limit?: number;
    dateFrom?: string | null;
    dateTo?: string | null;
  }
): Promise<ThreadMessageRow[]> {
  const ids = [...new Set(threadIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const limit = Math.min(Math.max(options?.limit ?? 400, 1), 750);
  let q = supabase
    .schema(schema)
    .from("thread_messages")
    .select(
      "id, thread_id, body, author_user_id, author_contact_id, metadata, parent_message_id, created_at, edited_at"
    )
    .in("thread_id", ids);
  const from = options?.dateFrom?.trim();
  const to = options?.dateTo?.trim();
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) {
    console.error("listRecentMagGroupThreadMessagesForStream:", error.message, error.code);
    return [];
  }
  return (data ?? []) as ThreadMessageRow[];
}

export async function updateThreadParticipantLastRead(input: {
  thread_id: string;
  user_id: string;
  read_at?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const at = input.read_at ?? new Date().toISOString();
  const { data: existing } = await supabase
    .schema(schema)
    .from("thread_participants")
    .select("id")
    .eq("thread_id", input.thread_id)
    .eq("user_id", input.user_id)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .schema(schema)
      .from("thread_participants")
      .update({ last_read_at: at })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: new Error(error.message) };
    }
    return { ok: true, error: null };
  }
  const { error } = await supabase.schema(schema).from("thread_participants").insert({
    thread_id: input.thread_id,
    user_id: input.user_id,
    contact_id: null,
    last_read_at: at,
    role: null,
  });
  if (error) {
    return { ok: false, error: new Error(error.message) };
  }
  return { ok: true, error: null };
}

/** Per-thread unread for Message Center (latest message vs participant `last_read_at`). */
export async function getThreadUnreadMapForUser(
  userId: string,
  threadIds: string[]
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  const unique = [...new Set(threadIds.filter(Boolean))];
  if (!userId.trim() || unique.length === 0) return out;

  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: parts, error: pErr } = await supabase
    .schema(schema)
    .from("thread_participants")
    .select("thread_id, last_read_at")
    .eq("user_id", userId)
    .in("thread_id", unique);
  if (pErr) {
    console.error("getThreadUnreadMapForUser participants:", pErr.message);
    return out;
  }
  const byThread = new Map<string, string | null>();
  for (const p of (parts ?? []) as { thread_id: string; last_read_at: string | null }[]) {
    byThread.set(p.thread_id, p.last_read_at);
  }
  const lastByThread = await fetchLatestThreadMessagesForThreads(unique);
  for (const tid of unique) {
    const last = lastByThread.get(tid);
    if (!last?.created_at) {
      out.set(tid, false);
      continue;
    }
    if (!byThread.has(tid)) {
      out.set(tid, false);
      continue;
    }
    const readAtRaw = byThread.get(tid);
    const readAt = readAtRaw ? new Date(readAtRaw).getTime() : 0;
    out.set(tid, new Date(last.created_at).getTime() > readAt);
  }
  return out;
}

/** Threads where the user has unread messages (participant row vs latest message time). */
export async function countUnreadThreadsForUser(userId: string): Promise<number> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data: parts, error: pErr } = await supabase
    .schema(schema)
    .from("thread_participants")
    .select("thread_id, last_read_at")
    .eq("user_id", userId);
  if (pErr || !parts?.length) {
    if (pErr) console.error("countUnreadThreadsForUser participants:", pErr.message);
    return 0;
  }
  const threadIds = [...new Set((parts as { thread_id: string }[]).map((p) => p.thread_id))];
  const lastByThread = await fetchLatestThreadMessagesForThreads(threadIds);
  let n = 0;
  for (const p of parts as { thread_id: string; last_read_at: string | null }[]) {
    const last = lastByThread.get(p.thread_id);
    if (!last?.created_at) continue;
    const readAt = p.last_read_at ? new Date(p.last_read_at).getTime() : 0;
    if (new Date(last.created_at).getTime() > readAt) n++;
  }
  return n;
}
