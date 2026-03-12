/**
 * Transactional email templates (Step 21e).
 * Load template content by slug (content type Template, published), substitute placeholders, render body to HTML, send via SMTP.
 * If no published template exists for a slug, callers (21f, 21g) use fallback emails.
 *
 * Available placeholders (use {{key}} in template title/body):
 * customer_name, customer_email, order_id, order_total, items_summary, access_link,
 * site_name, business_name, business_address, business_phone, business_email.
 */

import { generateHTML, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { getContentByTypeAndSlug } from "@/lib/supabase/content";
import { sendEmail } from "@/lib/email/send";

/** Placeholders supported in template body and title. Resolved at send time from order/contact and site settings. */
export interface TemplateContext {
  customer_name?: string;
  customer_email?: string;
  order_id?: string;
  order_total?: string;
  items_summary?: string;
  access_link?: string;
  site_name?: string;
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  /** Step 25e: Preformatted time-limited download links (one per line: "Label - URL"). */
  download_links?: string;
  [key: string]: string | undefined;
}

const TIPTAP_EXTENSIONS = [
  StarterKit,
  Image.configure({ inline: true, allowBase64: true }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: "noopener noreferrer" },
  }),
];

/**
 * Replaces {{key}} in text with context[key]; unknown keys become empty string.
 */
export function substitutePlaceholders(
  text: string,
  context: TemplateContext
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return value != null ? String(value) : "";
  });
}

/**
 * Renders Tiptap JSON body to HTML (same extensions as RichTextDisplay).
 */
export function tiptapBodyToHtml(body: Record<string, unknown> | null): string {
  if (!body || typeof body !== "object") return "";
  try {
    return generateHTML(body as JSONContent, TIPTAP_EXTENSIONS);
  } catch {
    return "";
  }
}

/**
 * Fetches a published Template content row by slug. Returns null if not found or not published.
 */
export async function getPublishedTemplateBySlug(slug: string): Promise<{
  id: string;
  title: string;
  body: Record<string, unknown> | null;
} | null> {
  const row = await getContentByTypeAndSlug("template", slug);
  if (!row || row.status !== "published") return null;
  const body = row.body as Record<string, unknown> | null;
  return { id: row.id, title: row.title ?? "", body: body ?? null };
}

/**
 * Renders template (title + body) with context. Title → subject (placeholders substituted). Body → HTML (Tiptap → HTML then substitute).
 */
export function renderTemplate(
  template: { title: string; body: Record<string, unknown> | null },
  context: TemplateContext
): { subject: string; html: string } {
  const subject = substitutePlaceholders(template.title, context);
  const rawHtml = tiptapBodyToHtml(template.body);
  const html = substitutePlaceholders(rawHtml, context);
  return { subject, html };
}

/**
 * Sends an email using the template with the given slug. Uses existing SMTP.
 * @returns true if sent, "no_template" if no published template for slug (caller should use fallback), false if send failed.
 */
export async function sendTemplateEmail(
  slug: string,
  to: string | string[],
  context: TemplateContext
): Promise<boolean | "no_template"> {
  const template = await getPublishedTemplateBySlug(slug);
  if (!template) return "no_template";
  const { subject, html } = renderTemplate(template, context);
  const ok = await sendEmail({ to, subject, html });
  return ok;
}
