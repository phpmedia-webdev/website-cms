/**
 * Send Web Push notifications using VAPID and stored subscriptions.
 * Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env (and optionally VAPID_MAILTO).
 */

import webpush from "web-push";
import type { PushSubscriptionRow } from "./push-subscriptions";

const MAILTO = process.env.VAPID_MAILTO ?? "mailto:support@example.com";

function getVapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

/** One-time setup of VAPID details for web-push. Call before sending. */
function ensureVapidSet(): boolean {
  const keys = getVapidKeys();
  if (!keys) return false;
  try {
    webpush.setVapidDetails(MAILTO, keys.publicKey, keys.privateKey);
    return true;
  } catch {
    return false;
  }
}

export interface SendPushPayload {
  title: string;
  body: string;
  /** URL to open when user taps the notification. */
  actionUrl?: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns true if sent, false if VAPID not configured or send failed (errors logged).
 */
export async function sendPushToSubscription(
  sub: PushSubscriptionRow,
  payload: SendPushPayload
): Promise<boolean> {
  if (!ensureVapidSet()) return false;

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.actionUrl ?? "/status",
  });

  try {
    await webpush.sendNotification(pushSubscription, payloadStr);
    return true;
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      if ((err as { statusCode: number }).statusCode === 410 || (err as { statusCode: number }).statusCode === 404) {
        // Subscription expired or invalid; caller could remove it
      }
    }
    console.error("sendPushToSubscription error:", err);
    return false;
  }
}
