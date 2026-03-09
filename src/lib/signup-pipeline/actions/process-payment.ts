/**
 * Signup action: process payment (stub). Config may include product_id, amount, etc.
 * Implement when payment provider (Stripe, etc.) is integrated.
 */

import type { SignupActionHandler } from "../types";

export const processPayment: SignupActionHandler = async (_context, _config) => {
  // Stub: no-op for now. When implemented, use config (e.g. product_id, amount)
  // and context (contact, member) to create payment intent or subscription.
  return { success: true };
};
