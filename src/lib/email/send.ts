/**
 * Send email via SMTP using tenant-stored config.
 * Loads config from settings, decrypts password, creates transport; no send if not configured.
 */

import nodemailer from "nodemailer";
import { getSetting, getSiteMetadata } from "@/lib/supabase/settings";
import {
  SMTP_CONFIG_KEY,
  decryptSmtpPassword,
  toResolvedConfig,
  type SmtpConfigStored,
} from "./smtp-config";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content. */
  content: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  /** Override from address (optional). */
  from?: string;
  /** Optional attachments (filename + base64 content). */
  attachments?: EmailAttachment[];
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
  let from = options.from ?? resolved.from;
  // MVP branding: if no display name (from is just email), use site name from settings
  if (!from.includes(" <") && !from.includes(">")) {
    try {
      const meta = await getSiteMetadata();
      if (meta.name?.trim()) {
        const email = from.trim();
        from = `"${meta.name.replace(/"/g, '\\"')}" <${email}>`;
      }
    } catch {
      // keep from as-is if metadata unavailable
    }
  }

  const transport = nodemailer.createTransport({
    host: resolved.host,
    port: resolved.port,
    secure: resolved.secure ?? false,
    auth: { user: resolved.user, pass: resolved.pass },
  });

  const to = Array.isArray(options.to) ? options.to : [options.to];

  const attachmentPayload =
    options.attachments?.length
      ? options.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
    }))
      : undefined;

  const text = options.text ?? undefined;
  const html =
    options.html ??
    (text
      ? `<!DOCTYPE html><html><body><p style="white-space: pre-wrap;">${escapeHtml(text)}</p></body></html>`
      : undefined);

  try {
    await transport.sendMail({
      from,
      to,
      subject: options.subject,
      text: text ?? undefined,
      html,
      attachments: attachmentPayload?.length ? attachmentPayload : undefined,
    });
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}
