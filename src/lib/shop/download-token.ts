/**
 * Step 25d: Signed token for time-limited download links.
 * Payload: orderId, orderItemId, linkIndex, exp. Verified server-side; never expose real URL.
 */

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_EXPIRY_SECONDS = 72 * 60 * 60; // 72 hours
const ALG = "sha256";

function getSecret(): string {
  const secret = process.env.SHOP_DOWNLOAD_TOKEN_SECRET ?? process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret?.trim()) {
    throw new Error("SHOP_DOWNLOAD_TOKEN_SECRET or CREDENTIALS_ENCRYPTION_KEY must be set for download links");
  }
  return secret.trim();
}

export interface DownloadTokenPayload {
  orderId: string;
  orderItemId: string;
  linkIndex: number;
  exp: number;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

/**
 * Generate a signed token for a download link. Expires in expirySeconds (default 72h).
 */
export function generateDownloadToken(
  orderId: string,
  orderItemId: string,
  linkIndex: number,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS
): string {
  const exp = Math.floor(Date.now() / 1000) + expirySeconds;
  const payload: DownloadTokenPayload = { orderId, orderItemId, linkIndex, exp };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(Buffer.from(payloadStr, "utf8"));
  const secret = getSecret();
  const sig = createHmac(ALG, secret).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verify and decode token. Returns payload or null if invalid/expired.
 */
export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const secret = getSecret();
    const expectedSig = createHmac(ALG, secret).update(payloadB64).digest();
    const actualSig = base64UrlDecode(sigB64);
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) return null;
    const payloadStr = base64UrlDecode(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadStr) as DownloadTokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.orderId !== "string" || typeof payload.orderItemId !== "string" || typeof payload.linkIndex !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}
