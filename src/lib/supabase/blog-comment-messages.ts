/**
 * Blog comments live in `thread_messages` under `conversation_threads` (thread_type = blog_comment).
 * Canonical source for blog comment messaging. See migrations 191–192.
 */

import { createServerSupabaseClient } from "./server-service";
import { getClientSchema } from "./schema";
import type { CrmNote } from "./crm";
import {
  createConversationThread,
  insertThreadMessage,
  listThreadMessages,
} from "./conversation-threads";

/** `conversation_threads.subject_type` for CMS content (post) id. */
export const BLOG_COMMENT_SUBJECT_TYPE = "content";

const META_MODERATION = "blog_moderation_status";

export type BlogCommentModerationStatus = "pending" | "approved" | "rejected";

export function moderationStatusFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): BlogCommentModerationStatus {
  const v = metadata?.[META_MODERATION];
  if (v === "approved" || v === "rejected" || v === "pending") return v;
  return "pending";
}

async function findBlogThreadIdForContent(contentId: string): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const { data, error } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("id")
    .eq("thread_type", "blog_comment")
    .eq("subject_type", BLOG_COMMENT_SUBJECT_TYPE)
    .eq("subject_id", contentId)
    .maybeSingle();
  if (error) {
    console.error("findBlogThreadIdForContent:", error.message, error.code);
    return null;
  }
  return data?.id ?? null;
}

export async function getOrCreateBlogCommentThread(
  contentId: string
): Promise<{ threadId: string; error: Error | null }> {
  const existing = await findBlogThreadIdForContent(contentId);
  if (existing) return { threadId: existing, error: null };

  const { thread, error } = await createConversationThread({
    thread_type: "blog_comment",
    subject_type: BLOG_COMMENT_SUBJECT_TYPE,
    subject_id: contentId,
  });
  if (thread) return { threadId: thread.id, error: null };

  const msg = error?.message ?? "";
  if (msg.includes("duplicate") || msg.includes("unique") || (error as { code?: string })?.code === "23505") {
    const retry = await findBlogThreadIdForContent(contentId);
    if (retry) return { threadId: retry, error: null };
  }
  return { threadId: "", error: error ?? new Error("Failed to create blog comment thread") };
}

function threadMessageToCrmNoteRow(
  contentId: string,
  row: {
    id: string;
    body: string;
    author_user_id: string | null;
    created_at: string;
    edited_at: string | null;
    metadata: Record<string, unknown> | null;
  }
): CrmNote {
  const status = moderationStatusFromMetadata(row.metadata ?? undefined);
  return {
    id: row.id,
    contact_id: null,
    body: row.body,
    author_id: row.author_user_id,
    note_type: "blog_comment",
    created_at: row.created_at,
    updated_at: row.edited_at ?? row.created_at,
    content_id: contentId,
    status,
  };
}

/**
 * Create a blog comment (pending moderation). Auth user is stored as author_user_id.
 */
export async function createBlogCommentAsThreadMessage(
  contentId: string,
  body: string,
  authorUserId: string
): Promise<{ note: CrmNote | null; error: Error | null }> {
  const trimmed = body.trim();
  if (!contentId || !trimmed) {
    return { note: null, error: new Error("content_id and body are required") };
  }
  const { threadId, error: threadErr } = await getOrCreateBlogCommentThread(contentId);
  if (!threadId) return { note: null, error: threadErr ?? new Error("No thread") };

  const { message, error } = await insertThreadMessage({
    thread_id: threadId,
    body: trimmed,
    author_user_id: authorUserId,
    author_contact_id: null,
    metadata: { [META_MODERATION]: "pending" satisfies BlogCommentModerationStatus },
    parent_message_id: null,
  });
  if (error || !message) {
    return { note: null, error: error ?? new Error("Failed to insert comment") };
  }
  return { note: threadMessageToCrmNoteRow(contentId, message), error: null };
}

/**
 * List comments for a post. Same shape as `CrmNote` for API compatibility.
 */
export async function getBlogCommentsForContentAsNotes(
  contentId: string,
  status?: BlogCommentModerationStatus
): Promise<CrmNote[]> {
  const threadId = await findBlogThreadIdForContent(contentId);
  if (!threadId) return [];

  const messages = await listThreadMessages(threadId, { limit: 500 });
  const mapped = messages.map((m) => threadMessageToCrmNoteRow(contentId, m));
  if (status === undefined) return mapped;
  return mapped.filter((n) => (n.status as BlogCommentModerationStatus) === status);
}

export async function updateBlogCommentModerationStatus(
  messageId: string,
  status: "approved" | "rejected"
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { data: msg, error: fetchErr } = await supabase
    .schema(schema)
    .from("thread_messages")
    .select("id, metadata, thread_id")
    .eq("id", messageId)
    .maybeSingle();
  if (fetchErr || !msg) {
    return { success: false, error: new Error(fetchErr?.message ?? "Comment not found") };
  }

  const { data: th, error: thErr } = await supabase
    .schema(schema)
    .from("conversation_threads")
    .select("thread_type")
    .eq("id", msg.thread_id)
    .maybeSingle();
  if (thErr || th?.thread_type !== "blog_comment") {
    return { success: false, error: new Error("Not a blog comment message") };
  }

  const prev =
    msg.metadata && typeof msg.metadata === "object" && !Array.isArray(msg.metadata)
      ? (msg.metadata as Record<string, unknown>)
      : {};
  const metadata = { ...prev, [META_MODERATION]: status };

  const { error: upErr } = await supabase
    .schema(schema)
    .from("thread_messages")
    .update({
      metadata,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (upErr) {
    console.error("updateBlogCommentModerationStatus:", upErr.message, upErr.code);
    return { success: false, error: new Error(upErr.message) };
  }
  return { success: true, error: null };
}

type ThreadJoinRow = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string | null;
  metadata: Record<string, unknown> | null;
  conversation_threads:
    | {
        thread_type: string;
        subject_type: string | null;
        subject_id: string | null;
      }
    | {
        thread_type: string;
        subject_type: string | null;
        subject_id: string | null;
      }[]
    | null;
};

function normalizeThreadJoin(
  row: ThreadJoinRow
): { thread_type: string; subject_id: string | null } | null {
  const t = row.conversation_threads;
  if (!t) return null;
  const one = Array.isArray(t) ? t[0] : t;
  if (!one) return null;
  return { thread_type: one.thread_type, subject_id: one.subject_id };
}

/**
 * Recent blog comments for admin dashboard activity (newest first).
 */
export async function fetchRecentBlogCommentRowsForDashboard(limit: number): Promise<
  {
    id: string;
    body: string;
    created_at: string;
    author_user_id: string | null;
    metadata: Record<string, unknown> | null;
    content_id: string | null;
  }[]
> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();
  const take = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase
    .schema(schema)
    .from("thread_messages")
    .select(
      `
      id,
      body,
      created_at,
      author_user_id,
      metadata,
      conversation_threads!inner (
        thread_type,
        subject_type,
        subject_id
      )
    `
    )
    .eq("conversation_threads.thread_type", "blog_comment")
    .eq("conversation_threads.subject_type", BLOG_COMMENT_SUBJECT_TYPE)
    .order("created_at", { ascending: false })
    .limit(take);

  if (error) {
    console.error("fetchRecentBlogCommentRowsForDashboard:", error.message, error.code);
    return [];
  }

  const rows = (data ?? []) as ThreadJoinRow[];
  return rows
    .map((row) => {
      const th = normalizeThreadJoin(row);
      if (!th || th.thread_type !== "blog_comment") return null;
      return {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        author_user_id: row.author_user_id,
        metadata: row.metadata,
        content_id: th.subject_id,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}
