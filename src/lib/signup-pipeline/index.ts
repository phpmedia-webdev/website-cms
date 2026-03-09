/**
 * Signup pipeline: single entry point after a user signs up.
 * (1) Runs always-on steps (ensure CRM contact, ensure member row) to build context.
 * (2) Loads code→action rows from signup_code_actions (for signupCode or default).
 * (3) Runs each action in order; returns redirect from last row that has redirect_path.
 */

import type { SignupPipelineContext, SignupPipelineResult } from "./types";
import { getSignupActions } from "./get-actions";
import { ACTION_HANDLERS } from "./registry";
import { ensureMemberInCrm } from "@/lib/automations/on-member-signup";
import { createMemberForContact } from "@/lib/supabase/members";

export interface ProcessSignupParams {
  userId: string;
  email: string;
  displayName?: string | null;
  signupCode?: string | null;
}

/**
 * Run the signup pipeline for a newly signed-up user.
 * Always ensures CRM contact and member row, then runs code-dependent actions from the table.
 */
export async function processSignup(
  params: ProcessSignupParams
): Promise<SignupPipelineResult> {
  const { userId, email, displayName = null, signupCode = null } = params;
  const errors: string[] = [];
  let redirectTo: string | null = null;

  const context: SignupPipelineContext = {
    userId,
    email: typeof email === "string" ? email.trim().toLowerCase() : "",
    displayName: displayName ?? null,
    signupCode: signupCode ?? null,
    contact: null,
    member: null,
  };

  if (!context.email) {
    return { success: false, errors: ["Email is required"] };
  }

  // Always-on: ensure CRM contact
  const crmResult = await ensureMemberInCrm({
    userId,
    email: context.email,
    displayName: context.displayName ?? null,
  });
  if (crmResult.error) {
    return { success: false, errors: [crmResult.error] };
  }
  context.contact = crmResult.contact;

  // Always-on: ensure member row (link contact to portal member)
  if (context.contact) {
    const { member, error } = await createMemberForContact(
      context.contact.id,
      userId
    );
    if (error) errors.push(error);
    context.member = member ?? null;
  }

  const rows = await getSignupActions(signupCode);

  for (const row of rows) {
    const handler = ACTION_HANDLERS[row.action_type];
    if (!handler) {
      errors.push(`Unknown action_type: ${row.action_type}`);
      continue;
    }
    const result = await handler(context, row.config);
    if (!result.success && result.error) {
      errors.push(result.error);
    }
    if (row.redirect_path?.trim()) {
      redirectTo = row.redirect_path.trim();
    }
  }

  return {
    success: errors.length === 0,
    redirectTo: redirectTo ?? undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export { ACTION_HANDLERS, REGISTERED_ACTION_TYPES } from "./registry";
export { getSignupActions } from "./get-actions";
export type { SignupPipelineContext, SignupPipelineResult, SignupActionRow } from "./types";
