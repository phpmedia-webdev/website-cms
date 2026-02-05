/**
 * Automation: ensure a new member signup is added to the CRM and marked as "New".
 * Idempotent: if a contact with this email already exists, we do not overwrite; they remain in CRM for membership use.
 */

import {
  getContactByEmail,
  createContact,
  updateContact,
  type CrmContact,
} from "@/lib/supabase/crm";
import { CRM_STATUS_SLUG_NEW } from "@/lib/supabase/settings";

export interface EnsureMemberInCrmParams {
  /** Auth user id (for logging/linking only; CRM contact does not store it today) */
  userId: string;
  /** Email (required for contact match/create) */
  email: string;
  /** Optional display name for full_name */
  displayName?: string | null;
}

export interface EnsureMemberInCrmResult {
  contact: CrmContact | null;
  /** True if we created a new contact; false if one already existed */
  created: boolean;
  error?: string;
}

const SOURCE_MEMBER_SIGNUP = "member_signup";

/**
 * Ensure the given member exists in the CRM with status "New".
 * If a contact with this email already exists, returns it and created: false.
 * If not, creates a new contact with status "New" and source "member_signup".
 */
export async function ensureMemberInCrm(
  params: EnsureMemberInCrmParams
): Promise<EnsureMemberInCrmResult> {
  const { userId: _userId, email, displayName } = params;
  const emailTrimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!emailTrimmed) {
    return { contact: null, created: false, error: "Email is required" };
  }

  const fullName =
    typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : null;

  try {
    const existing = await getContactByEmail(emailTrimmed);
    if (existing) {
      // Keep CRM full_name in sync with member's display name (profile page)
      if (fullName != null && existing.full_name !== fullName) {
        const { error: updateErr } = await updateContact(existing.id, { full_name: fullName });
        if (updateErr) {
          return { contact: existing, created: false, error: updateErr.message };
        }
        return { contact: { ...existing, full_name: fullName }, created: false };
      }
      return { contact: existing, created: false };
    }

    const { contact, error } = await createContact({
      email: emailTrimmed,
      status: CRM_STATUS_SLUG_NEW,
      source: SOURCE_MEMBER_SIGNUP,
      full_name: fullName ?? null,
      first_name: null,
      last_name: null,
      phone: null,
      company: null,
      address: null,
      city: null,
      state: null,
      postal_code: null,
      country: null,
      dnd_status: null,
      form_id: null,
      external_crm_id: null,
      external_crm_synced_at: null,
      message: null,
    });

    if (error) {
      return { contact: null, created: false, error: error.message };
    }
    return { contact, created: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { contact: null, created: false, error: message };
  }
}
