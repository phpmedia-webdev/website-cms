/**
 * Product comment moderation helpers.
 * Product comments are stored as `thread_messages` under `conversation_threads.thread_type = product_comment`.
 */

import { createServerSupabaseClient } from "./server-service";
import { getClientSchema } from "./schema";

const META_MODERATION = "product_moderation_status";

export async function updateProductCommentModerationStatus(
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
  if (thErr || th?.thread_type !== "product_comment") {
    return { success: false, error: new Error("Not a product comment message") };
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
    console.error("updateProductCommentModerationStatus:", upErr.message, upErr.code);
    return { success: false, error: new Error(upErr.message) };
  }
  return { success: true, error: null };
}
