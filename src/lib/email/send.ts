/**
 * Send email via SMTP using tenant-stored config.
 * Loads config from settings, decrypts password, creates transport; no send if not configured.
 */

import nodemailer from "nodemailer";
import { getSetting } from "@/lib/supabase/settings";
import {
  SMTP_CONFIG_KEY,
  decryptSmtpPassword,
  toResolvedConfig,
  type SmtpConfigStored,
} from "./smtp-config";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  /** Override from address (optional). */
  from?: string;
}

/**
 * Send a single email using the tenant's SMTP config.
 * Returns true if sent, false if SMTP not configured or send failed (errors logged).
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const stored = await getSetting<SmtpConfigStored>(SMTP_CONFIG_KEY);
  if (!stored?.host?.trim() || !stored.password_encrypted?.trim()) {
    return false;
  }

  const pass = decryptSmtpPassword(stored.password_encrypted);
  if (!pass) return false;

  const resolved = toResolvedConfig(stored, pass);
  const transport = nodemailer.createTransport({
    host: resolved.host,
    port: resolved.port,
    secure: resolved.secure ?? false,
    auth: { user: resolved.user, pass: resolved.pass },
  });

  const to = Array.isArray(options.to) ? options.to : [options.to];
  const from = options.from ?? resolved.from;

  try {
    await transport.sendMail({
      from,
      to,
      subject: options.subject,
      text: options.text ?? undefined,
      html: options.html ?? undefined,
    });
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}
