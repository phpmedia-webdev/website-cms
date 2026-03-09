/**
 * Signup action: ensure contact exists in CRM (status New, source member_signup).
 * Idempotent. Updates context.contact.
 */

import type { SignupPipelineContext, SignupActionHandler } from "../types";
import { ensureMemberInCrm } from "@/lib/automations/on-member-signup";

export const ensureCrm: SignupActionHandler = async (context, _config) => {
  const result = await ensureMemberInCrm({
    userId: context.userId,
    email: context.email,
    displayName: context.displayName ?? null,
  });
  if (result.error) {
    return { success: false, error: result.error };
  }
  (context as { contact: typeof result.contact }).contact = result.contact;
  return { success: true };
};
