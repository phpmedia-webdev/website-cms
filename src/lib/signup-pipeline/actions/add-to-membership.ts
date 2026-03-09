/**
 * Signup action: ensure member row exists, then redeem signup code (add contact to MAG).
 * Uses context.signupCode as the code to redeem. Config can override (e.g. mag_id for direct assign) in future.
 */

import type { SignupPipelineContext, SignupActionHandler } from "../types";
import { createMemberForContact } from "@/lib/supabase/members";
import { redeemCode } from "@/lib/mags/code-generator";

export const addToMembership: SignupActionHandler = async (context, _config) => {
  if (!context.contact) {
    return { success: false, error: "Contact required; run ensure_crm first." };
  }
  let member = context.member;
  if (!member) {
    const { member: m, error } = await createMemberForContact(
      context.contact.id,
      context.userId
    );
    if (error) {
      return { success: false, error };
    }
    member = m ?? null;
    (context as { member: typeof member }).member = member;
  }
  if (!member) {
    return { success: false, error: "Member row could not be created." };
  }
  const code = context.signupCode?.trim();
  if (!code) {
    return { success: false, error: "Signup code required for add_to_membership." };
  }
  const result = await redeemCode(code, member.id);
  if (!result.success) {
    return { success: false, error: result.error ?? "Code redemption failed." };
  }
  return { success: true };
};
