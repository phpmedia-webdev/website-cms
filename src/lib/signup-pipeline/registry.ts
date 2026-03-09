/**
 * Action type → handler registry. Add new action types here and implement in actions/.
 * No code from DB; all handlers are in codebase.
 */

import type { SignupActionHandler } from "./types";
import { ensureCrm } from "./actions/ensure-crm";
import { addToMembership } from "./actions/add-to-membership";
import { processPayment } from "./actions/process-payment";

export const ACTION_HANDLERS: Record<string, SignupActionHandler> = {
  ensure_crm: ensureCrm,
  add_to_membership: addToMembership,
  process_payment: processPayment,
};

export const REGISTERED_ACTION_TYPES = Object.keys(ACTION_HANDLERS);
