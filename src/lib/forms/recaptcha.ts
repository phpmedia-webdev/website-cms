/**
 * Server-side reCAPTCHA token verification (Google).
 * Uses secret key from tenant form protection settings.
 */

export interface RecaptchaVerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  errorCodes?: string[];
}

/**
 * Verify a reCAPTCHA token with Google's siteverify API.
 * @param secretKey - Tenant's reCAPTCHA secret key
 * @param token - Token from client (g-recaptcha-response or captcha_token)
 * @param remoteip - Optional client IP for analytics
 */
export async function verifyRecaptchaToken(
  secretKey: string,
  token: string,
  remoteip?: string
): Promise<RecaptchaVerifyResult> {
  if (!secretKey?.trim() || !token?.trim()) {
    return { success: false, errorCodes: ["missing-input"] };
  }
  const params = new URLSearchParams({
    secret: secretKey.trim(),
    response: token.trim(),
  });
  if (remoteip) params.set("remoteip", remoteip);

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };
    return {
      success: Boolean(data.success),
      score: data.score,
      action: data.action,
      errorCodes: data["error-codes"],
    };
  } catch (e) {
    console.error("recaptcha verify error:", e);
    return { success: false, errorCodes: ["request-failed"] };
  }
}
