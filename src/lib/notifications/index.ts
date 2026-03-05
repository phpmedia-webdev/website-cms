/**
 * Notifications module — single place for where, when, and how notifications are sent.
 * Reads per-action preferences (email/pwa) from tenant settings; entry points per action
 * call sendEmail and/or sendPushToSubscriptions when enabled.
 */

import { getSetting } from "@/lib/supabase/settings";
import {
  NOTIFICATIONS_PREFERENCES_KEY,
  mergeWithDefaults,
  type NotificationActionKey,
  type NotificationPreferences,
} from "./actions";
import { sendEmail } from "@/lib/email/send";
import { SMTP_CONFIG_KEY } from "@/lib/email/smtp-config";
import type { SmtpConfigStored } from "@/lib/email/smtp-config";
import { sendPushToSubscriptions } from "./push";

export type { NotificationActionKey, NotificationPreferences };
export {
  NOTIFICATION_ACTION_KEYS,
  NOTIFICATION_ACTION_LABELS,
  NOTIFICATIONS_PREFERENCES_KEY,
  getDefaultPreferences,
  mergeWithDefaults,
} from "./actions";
export type { PushPayload } from "./push";
export { sendPushToSubscriptions } from "./push";

/**
 * Get current notification preferences (email/pwa per action) for the current tenant.
 * Use in notification triggers to decide whether to send email and/or PWA.
 */
export async function getNotificationPreferences(): Promise<
  Record<NotificationActionKey, { email: boolean; pwa: boolean }>
> {
  const raw = await getSetting<NotificationPreferences>(NOTIFICATIONS_PREFERENCES_KEY);
  return mergeWithDefaults(raw ?? null);
}

/**
 * Check if email is enabled for an action. Use before calling sendEmail in triggers.
 */
export async function isEmailEnabledForAction(
  actionKey: NotificationActionKey
): Promise<boolean> {
  const prefs = await getNotificationPreferences();
  return prefs[actionKey]?.email ?? false;
}

/**
 * Check if PWA push is enabled for an action. Use before calling sendPush in triggers.
 */
export async function isPwaEnabledForAction(
  actionKey: NotificationActionKey
): Promise<boolean> {
  const prefs = await getNotificationPreferences();
  return prefs[actionKey]?.pwa ?? false;
}

export interface NotifyOnFormSubmittedPayload {
  formId: string;
  formName: string;
  submissionId: string;
  contactId?: string | null;
}

/**
 * Called after a form submission is saved. Sends email and/or PWA push per Notifications settings.
 * Fire-and-forget from the form submit API so the response is not blocked.
 */
export async function notifyOnFormSubmitted(
  payload: NotifyOnFormSubmittedPayload
): Promise<void> {
  const prefs = await getNotificationPreferences();
  const formPref = prefs.form_submitted;
  if (!formPref?.email && !formPref?.pwa) return;

  if (formPref.email) {
    const smtp = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);
    const recipients = smtp?.notification_recipients
      ?.split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipients?.length) {
      await sendEmail({
        to: recipients,
        subject: `New form submission: ${payload.formName}`,
        text: `A new submission was received for form "${payload.formName}". Submission ID: ${payload.submissionId}. View in Admin → CRM → Forms → Submissions.`,
      });
    }
  }

  if (formPref.pwa) {
    await sendPushToSubscriptions({
      actionKey: "form_submitted",
      title: "New form submission",
      body: payload.formName,
      actionUrl: `/admin/crm/forms/${payload.formId}/submissions`,
    });
  }
}

export interface NotifyOnMemberSignedUpPayload {
  userEmail: string;
  displayName?: string | null;
}

/**
 * Called when a new member/user signs up. Sends welcome email to the user and/or PWA to admins per Notifications settings.
 * Wire from signup/registration flow when implemented.
 */
export async function notifyOnMemberSignedUp(
  payload: NotifyOnMemberSignedUpPayload
): Promise<void> {
  const prefs = await getNotificationPreferences();
  const pref = prefs.member_signed_up;
  if (!pref?.email && !pref?.pwa) return;

  const label = payload.displayName?.trim() || payload.userEmail;

  if (pref.email) {
    await sendEmail({
      to: [payload.userEmail],
      subject: "Welcome",
      text: `Hi ${label},\n\nThanks for signing up.`,
    });
    const smtp = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);
    const adminRecipients = smtp?.notification_recipients
      ?.split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (adminRecipients?.length) {
      await sendEmail({
        to: adminRecipients,
        subject: "New member signed up",
        text: `${label} (${payload.userEmail}) signed up.`,
      });
    }
  }

  if (pref.pwa) {
    await sendPushToSubscriptions({
      actionKey: "member_signed_up",
      title: "New member signed up",
      body: label,
      actionUrl: "/admin/crm/contacts",
    });
  }
}

export interface NotifyOnContactJoinsMembershipPayload {
  contactId: string;
  contactName?: string;
  membershipName?: string;
}

/**
 * Called when a contact joins a membership. Sends email and/or PWA push per Notifications settings.
 * Wire from membership-join flow when implemented.
 */
export async function notifyOnContactJoinsMembership(
  payload: NotifyOnContactJoinsMembershipPayload
): Promise<void> {
  const prefs = await getNotificationPreferences();
  const pref = prefs.contact_joins_membership;
  if (!pref?.email && !pref?.pwa) return;

  const label = payload.contactName ?? "A contact";
  const membershipLabel = payload.membershipName ?? "a membership";

  if (pref.email) {
    const smtp = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);
    const recipients = smtp?.notification_recipients
      ?.split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipients?.length) {
      await sendEmail({
        to: recipients,
        subject: `Contact joined: ${membershipLabel}`,
        text: `${label} joined ${membershipLabel}. View in Admin → CRM.`,
      });
    }
  }

  if (pref.pwa) {
    await sendPushToSubscriptions({
      actionKey: "contact_joins_membership",
      title: "Contact joined membership",
      body: `${label} joined ${membershipLabel}`,
      actionUrl: "/admin/crm/contacts",
    });
  }
}
