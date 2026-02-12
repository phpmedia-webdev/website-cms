/**
 * Multi-Factor Authentication (MFA) utilities for Supabase Auth.
 * Handles TOTP enrollment, challenge, and verification.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { AuthUser } from "./supabase-auth";

export interface MFAFactor {
  id: string;
  type: "totp" | "sms" | "phone";
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
}

export interface TOTPEnrollment {
  qr_code: string;
  secret: string;
  uri: string;
}

/**
 * Enroll a TOTP factor for the current user.
 * Generates QR code and secret for authenticator app setup.
 * 
 * @param friendlyName - Optional friendly name for the factor (e.g., "iPhone", "Google Authenticator")
 * @returns Enrollment data with QR code and secret, or error
 */
export async function enrollTOTP(
  friendlyName?: string
): Promise<{ enrollment: TOTPEnrollment | null; error: Error | null }> {
  try {
    const supabase = createServerSupabaseClient();

    // Start TOTP enrollment
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: friendlyName || "Authenticator App",
    });

    if (error) {
      console.error("Error enrolling TOTP:", error);
      return { enrollment: null, error: new Error(error.message) };
    }

    if (!data) {
      return { enrollment: null, error: new Error("No enrollment data returned") };
    }

    return {
      enrollment: {
        qr_code: data.qr_code || "",
        secret: data.secret || "",
        uri: data.uri || "",
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Error enrolling TOTP:", error);
    return { enrollment: null, error: new Error(error.message || "Failed to enroll TOTP") };
  }
}

/**
 * Challenge an enrolled MFA factor.
 * Initiates a challenge that requires the user to provide a code.
 * 
 * @param factorId - The ID of the factor to challenge
 * @returns Challenge ID for verification, or error
 */
export async function challengeMFA(
  factorId: string
): Promise<{ challengeId: string | null; error: Error | null }> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      console.error("Error challenging MFA:", error);
      return { challengeId: null, error: new Error(error.message) };
    }

    return {
      challengeId: data?.id || null,
      error: null,
    };
  } catch (error: any) {
    console.error("Error challenging MFA:", error);
    return { challengeId: null, error: new Error(error.message || "Failed to challenge MFA") };
  }
}

/**
 * Verify an MFA code and upgrade session to aal2.
 * 
 * @param challengeId - The challenge ID from challengeMFA()
 * @param code - The TOTP code from the authenticator app
 * @returns Success status and updated session, or error
 */
export async function verifyMFA(
  challengeId: string,
  code: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.mfa.verify({
      challengeId,
      code,
    });

    if (error) {
      console.error("Error verifying MFA:", error);
      return { success: false, error: new Error(error.message) };
    }

    // Session is automatically upgraded to aal2 on successful verification
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error verifying MFA:", error);
    return { success: false, error: new Error(error.message || "Failed to verify MFA") };
  }
}

/**
 * Get all enrolled MFA factors for the current user.
 * 
 * @returns Array of enrolled factors, or error
 */
export async function getEnrolledFactors(): Promise<{
  factors: MFAFactor[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error("Error listing MFA factors:", error);
      return { factors: [], error: new Error(error.message) };
    }

    const factors: MFAFactor[] = (data?.all || []).map((factor: any) => ({
      id: factor.id,
      type: factor.type,
      friendly_name: factor.friendly_name,
      status: factor.status,
      created_at: factor.created_at,
    }));

    return { factors, error: null };
  } catch (error: any) {
    console.error("Error listing MFA factors:", error);
    return { factors: [], error: new Error(error.message || "Failed to list MFA factors") };
  }
}

/**
 * Unenroll (remove) an MFA factor.
 * 
 * @param factorId - The ID of the factor to remove
 * @returns Success status, or error
 */
export async function unenrollFactor(
  factorId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      console.error("Error unenrolling factor:", error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error unenrolling factor:", error);
    return { success: false, error: new Error(error.message || "Failed to unenroll factor") };
  }
}

/**
 * Get the current Authenticator Assurance Level (AAL) from the session.
 * 
 * @param user - Authenticated user (optional, will fetch current user if not provided)
 * @returns AAL level ('aal1' or 'aal2'), or null if not authenticated
 */
export async function getAAL(
  user?: AuthUser | null
): Promise<"aal1" | "aal2" | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    return (session.aal as "aal1" | "aal2") || "aal1";
  } catch (error) {
    console.error("Error getting AAL:", error);
    return null;
  }
}

/**
 * Check if 2FA requirements are bypassed (dev/staging).
 * When NEXT_PUBLIC_DEV_BYPASS_2FA=true (or "1"), 2FA is skipped so you can test without MFA.
 * Works in any environment (local and Vercel preview/staging). For production, leave unset.
 *
 * @returns true if bypass is enabled
 */
export function isDevModeBypassEnabled(): boolean {
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_2FA;
  return devBypass === "true" || devBypass === "1";
}

/**
 * Check if a route or role requires aal2 (2FA verified).
 * 
 * @param user - Authenticated user
 * @param route - Optional route path to check
 * @returns true if aal2 is required, false otherwise
 */
export async function requiresAAL2(
  user: AuthUser | null,
  route?: string
): Promise<boolean> {
  if (!user) {
    return false;
  }

  // Dev mode bypass for 2FA (development only)
  // In development, if NEXT_PUBLIC_DEV_BYPASS_2FA=true, skip 2FA requirements
  if (isDevModeBypassEnabled()) {
    return false;
  }

  // Superadmin routes always require aal2
  if (route?.startsWith("/admin/super")) {
    return true;
  }

  // Superadmin role always requires aal2
  if (user.metadata.type === "superadmin" && user.metadata.role === "superadmin") {
    return true;
  }

  // Client admin sensitive routes require aal2
  if (user.metadata.type === "admin") {
    const sensitiveRoutes = [
      "/admin/settings",
      "/admin/crm/memberships",
      "/admin/settings/archive",
      "/admin/settings/reset",
    ];

    if (route && sensitiveRoutes.some((r) => route.startsWith(r))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user has any enrolled MFA factors.
 * 
 * @returns true if user has at least one enrolled factor, false otherwise
 */
export async function hasEnrolledFactors(): Promise<boolean> {
  const { factors } = await getEnrolledFactors();
  return factors.length > 0;
}
