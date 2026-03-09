/**
 * Signup pipeline types. Context is built by always-on steps and passed to each action handler.
 */

import type { CrmContact } from "@/lib/supabase/crm";
import type { Member } from "@/lib/supabase/members";

export interface SignupPipelineContext {
  userId: string;
  email: string;
  displayName?: string | null;
  signupCode?: string | null;
  /** Set by ensure_crm / always steps */
  contact: CrmContact | null;
  /** Set by ensure member row (createMemberForContact) */
  member: Member | null;
}

export interface SignupPipelineResult {
  success: boolean;
  redirectTo?: string | null;
  errors?: string[];
}

export interface SignupActionRow {
  id: string;
  signup_code: string | null;
  action_type: string;
  sort_order: number;
  config: Record<string, unknown> | null;
  redirect_path: string | null;
}

export type SignupActionHandler = (
  context: SignupPipelineContext,
  config: Record<string, unknown> | null
) => Promise<{ success: boolean; error?: string }>;
