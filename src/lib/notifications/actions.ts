/**
 * Hardcoded notification action keys and labels.
 * Used by the Notifications settings page and the notifications module.
 * Add new actions here as needed; no DB table for dynamic config.
 */

export const NOTIFICATION_ACTION_KEYS = [
  "form_submitted",
  "contact_joins_membership",
  "member_signed_up",
] as const;

export type NotificationActionKey = (typeof NOTIFICATION_ACTION_KEYS)[number];

/** Display label for each action (for UI). */
export const NOTIFICATION_ACTION_LABELS: Record<NotificationActionKey, string> = {
  form_submitted: "New Form Submitted",
  contact_joins_membership: "Contact joins a membership",
  member_signed_up: "Member signed up",
};

/** Per-action preferences: whether to send email and/or PWA for this action. */
export interface NotificationActionPreference {
  email: boolean;
  pwa: boolean;
}

/** Stored shape: keyed by action key. */
export type NotificationPreferences = Partial<
  Record<NotificationActionKey, NotificationActionPreference>
>;

export const NOTIFICATIONS_PREFERENCES_KEY = "notifications.preferences";

/** Default preferences when none stored (all off). */
export function getDefaultPreferences(): NotificationPreferences {
  return NOTIFICATION_ACTION_KEYS.reduce<NotificationPreferences>((acc, key) => {
    acc[key] = { email: false, pwa: false };
    return acc;
  }, {});
}

/** Merge stored prefs with defaults so every action has email/pwa. */
export function mergeWithDefaults(
  stored: NotificationPreferences | null
): Record<NotificationActionKey, NotificationActionPreference> {
  const out = getDefaultPreferences() as Record<
    NotificationActionKey,
    NotificationActionPreference
  >;
  if (!stored) return out;
  for (const key of NOTIFICATION_ACTION_KEYS) {
    const p = stored[key];
    if (p && typeof p.email === "boolean" && typeof p.pwa === "boolean") {
      out[key] = { email: p.email, pwa: p.pwa };
    }
  }
  return out;
}
