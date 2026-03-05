/**
 * SMTP config storage and encryption.
 * Config is stored in tenant settings under SMTP_CONFIG_KEY; password is encrypted at rest.
 * Server-side only; never expose decrypted password or ciphertext to client.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

export const SMTP_CONFIG_KEY = "smtp";

export interface SmtpConfigStored {
  host: string;
  port: number;
  user: string;
  from_email: string;
  from_name?: string;
  secure?: boolean;
  /** Encrypted with SMTP_ENCRYPTION_KEY; never send to client. */
  password_encrypted: string;
  /** Comma-separated email addresses for notification recipients. */
  notification_recipients?: string;
}

/** Shape returned to client (no password). */
export interface SmtpConfigPublic {
  host: string;
  port: number;
  user: string;
  from_email: string;
  from_name?: string;
  secure?: boolean;
  password_set: boolean;
  /** Comma-separated email addresses for notifications. */
  notification_recipients?: string;
}

/** Nodemailer-friendly config with decrypted password (use only in send lib, discard after). */
export interface SmtpConfigResolved {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
}

const ALG = "aes-256-cbc";
const IV_LEN = 16;
const KEY_LEN = 32;

function getEncryptionKey(): Buffer {
  const raw = process.env.SMTP_ENCRYPTION_KEY ?? process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    throw new Error("SMTP_ENCRYPTION_KEY or CREDENTIALS_ENCRYPTION_KEY must be set to store SMTP password");
  }
  const key = Buffer.from(raw.trim(), "utf8");
  if (key.length >= KEY_LEN) {
    return key.subarray(0, KEY_LEN);
  }
  return createHash("sha256").update(key).digest();
}

/**
 * Encrypt a plain-text password for storage. Server-side only.
 */
export function encryptSmtpPassword(plain: string): string {
  if (!plain) return "";
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

/**
 * Decrypt stored password. Server-side only; use only when building transport, then discard.
 */
export function decryptSmtpPassword(encrypted: string): string {
  if (!encrypted || !encrypted.includes(":")) return "";
  try {
    const [ivHex, encHex] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const enc = Buffer.from(encHex, "hex");
    if (iv.length !== IV_LEN || enc.length === 0) return "";
    const key = getEncryptionKey();
    const decipher = createDecipheriv(ALG, key, iv);
    return decipher.update(enc).toString("utf8") + decipher.final("utf8");
  } catch {
    return "";
  }
}

export function toPublicConfig(stored: SmtpConfigStored | null): SmtpConfigPublic | null {
  if (!stored?.host) return null;
  return {
    host: stored.host,
    port: stored.port ?? 587,
    user: stored.user ?? "",
    from_email: stored.from_email ?? "",
    from_name: stored.from_name,
    secure: stored.secure,
    password_set: !!(stored.password_encrypted && stored.password_encrypted.trim()),
    notification_recipients: stored.notification_recipients ?? "",
  };
}

export function toResolvedConfig(
  stored: SmtpConfigStored,
  decryptedPassword: string
): SmtpConfigResolved {
  const from =
    stored.from_name?.trim()
      ? `"${stored.from_name.replace(/"/g, '\\"')}" <${stored.from_email}>`
      : stored.from_email;
  return {
    host: stored.host,
    port: stored.port ?? 587,
    user: stored.user ?? "",
    pass: decryptedPassword,
    from,
    secure: stored.secure,
  };
}
