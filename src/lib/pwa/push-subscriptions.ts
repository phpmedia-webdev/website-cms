/**
 * Push subscription storage for PWA (admin status app).
 * Table: push_subscriptions (tenant schema): user_id, endpoint, p256dh, auth.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Save or update a push subscription for the given user. Upserts by (user_id, endpoint). */
export async function savePushSubscription(
  userId: string,
  input: PushSubscriptionInput
): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { error } = await supabase
    .schema(schema)
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: input.endpoint.trim(),
        p256dh: input.p256dh.trim(),
        auth: input.auth.trim(),
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("savePushSubscription error:", error);
    return false;
  }
  return true;
}

/** Get all push subscriptions for the current tenant (for sending to all admins). */
export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { data, error } = await supabase
    .schema(schema)
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, created_at");

  if (error) {
    console.error("getPushSubscriptions error:", error);
    return [];
  }
  return (data as PushSubscriptionRow[]) ?? [];
}

/** Delete a subscription by id (optional; for “unsubscribe” flow). */
export async function deletePushSubscriptionById(id: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { error } = await supabase
    .schema(schema)
    .from("push_subscriptions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deletePushSubscriptionById error:", error);
    return false;
  }
  return true;
}

/** Delete all subscriptions for a user (e.g. when revoking admin). */
export async function deletePushSubscriptionsByUserId(userId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const schema = getClientSchema();

  const { error } = await supabase
    .schema(schema)
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("deletePushSubscriptionsByUserId error:", error);
    return false;
  }
  return true;
}
