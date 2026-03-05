/**
 * PWA push notification delivery.
 * Sends push to admin subscribers when notification actions are triggered.
 */

import type { NotificationActionKey } from "./actions";
import { getPushSubscriptions } from "@/lib/pwa/push-subscriptions";
import { sendPushToSubscription } from "@/lib/pwa/send-push";

export interface PushPayload {
  title: string;
  body: string;
  /** Optional URL to open when user taps the notification (e.g. /admin/crm/forms/xxx/submissions). */
  actionUrl?: string;
  /** Action key for filtering (e.g. form_submitted). */
  actionKey: NotificationActionKey;
}

/**
 * Send push notifications to admin subscribers for the current tenant.
 * Call after checking isPwaEnabledForAction(actionKey) in the notification entry point.
 * Loads subscriptions from DB and sends via Web Push (VAPID). No-op if VAPID not configured or no subscriptions.
 */
export async function sendPushToSubscriptions(payload: PushPayload): Promise<void> {
  const subs = await getPushSubscriptions();
  if (subs.length === 0) return;

  const sendPayload = {
    title: payload.title,
    body: payload.body,
    actionUrl: payload.actionUrl ?? "/status",
  };

  await Promise.allSettled(
    subs.map((sub) => sendPushToSubscription(sub, sendPayload))
  );
}
