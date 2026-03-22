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
