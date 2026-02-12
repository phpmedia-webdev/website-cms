/**
 * RAG Knowledge Export: assemble content marked "Use for Agent Training" into a single
 * document (or segments under a token limit) for chatbot training.
 * Server-only: uses createServerSupabaseClient.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Max tokens per part (segment). Many bots use 8k–16k; 8k is a safe default. Override with RAG_MAX_TOKENS_PER_PART env. */
export const DEFAULT_MAX_TOKENS_PER_PART = 8000;

export function getMaxTokensPerPart(): number {
  const env = process.env.RAG_MAX_TOKENS_PER_PART;
  if (env != null && env !== "") {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_MAX_TOKENS_PER_PART;
}

/** Rough estimate: ~4 chars per token for English. */
export function estimateTokens(text: string): number {
  if (!text || !text.length) return 0;
  return Math.ceil(text.length / 4);
}

/** Extract plain text from Tiptap JSON (content.body). */
export function tiptapToPlainText(doc: Record<string, unknown> | null): string {
  if (!doc || typeof doc !== "object") return "";
  const parts: string[] = [];

  function walk(node: Record<string, unknown>) {
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }
    const content = node.content;
    if (Array.isArray(content)) {
      for (const child of content) {
        if (child && typeof child === "object" && !Array.isArray(child)) {
          walk(child as Record<string, unknown>);
        }
      }
    }
    if (node.type === "paragraph" || node.type === "heading") parts.push("\n");
    if (node.type === "hardBreak") parts.push("\n");
  }

  walk(doc);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export interface RagContentRow {
  id: string;
  title: string;
  slug: string;
  body: Record<string, unknown> | null;
  excerpt: string | null;
  updated_at: string;
  /** Content type slug (e.g. faq, post) for packing rules; FAQ is never split. */
  type_slug?: string | null;
}

/**
 * Server-only: fetch content rows for RAG feed.
 * Only includes content that is: use_for_agent_training = true, status = 'published',
 * and PUBLIC (access_level is null or 'public', required_mag_id is null).
 * Membership-protected content is never included in the feed.
 * Joins content_types to get type_slug for packing (FAQ never split).
 */
export async function getRagContentRows(): Promise<RagContentRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content")
    .select("id, title, slug, body, excerpt, updated_at, content_types!content_type_id(slug)")
    .eq("use_for_agent_training", true)
    .eq("status", "published")
    .or("access_level.is.null,access_level.eq.public")
    .is("required_mag_id", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getRagContentRows:", error);
    return [];
  }
  const raw = (data as (Omit<RagContentRow, "type_slug"> & { content_types: { slug: string } | { slug: string }[] | null })[]) ?? [];
  return raw.map((r) => {
    const ct = r.content_types;
    const slug = ct == null ? null : Array.isArray(ct) ? ct[0]?.slug ?? null : ct.slug;
    const { content_types: _, ...rest } = r;
    return { ...rest, type_slug: slug ?? null };
  });
}

const ARTICLE_SEP = "\n\n---\n\n";

/**
 * Build one article blob (title + excerpt + body) for a single RAG row.
 */
export function buildArticleBlob(row: RagContentRow): string {
  const bodyText = tiptapToPlainText(row.body);
  const excerpt = (row.excerpt || "").trim();
  const parts = [`# ${row.title}`];
  if (excerpt) parts.push(excerpt);
  if (bodyText) parts.push(bodyText);
  return parts.join("\n\n");
}

/**
 * Sub-split one oversize article at newlines; add "Blog post: [Title]" and "Continued from blog post: [Title]" headers.
 * Reserves space for the header in each chunk. Returns array of segment strings.
 */
function splitArticleWithHeaders(
  blob: string,
  title: string,
  maxCharsPerPart: number
): string[] {
  const headerFirst = `Blog post: ${title}\n\n`;
  const headerCont = `Continued from blog post: ${title}\n\n`;
  const maxBody = maxCharsPerPart - headerFirst.length;
  if (blob.length <= maxBody) {
    return [headerFirst + blob];
  }
  const segments: string[] = [];
  let remaining = blob;
  let first = true;
  while (remaining.length > 0) {
    const header = first ? headerFirst : headerCont;
    const maxBodyThis = maxCharsPerPart - header.length;
    if (remaining.length <= maxBodyThis) {
      segments.push(header + remaining);
      break;
    }
    const chunk = remaining.slice(0, maxBodyThis);
    const lastNewline = chunk.lastIndexOf("\n");
    const splitAt = lastNewline > maxBodyThis / 2 ? lastNewline + 1 : maxBodyThis;
    segments.push(header + remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n+/, "");
    first = false;
  }
  return segments;
}

/**
 * Pack articles into segments so whole articles stay in one URL.
 * - FAQ content: never split; each FAQ doc is one atomic unit (whole blob in one segment).
 * - Other content: pack blobs into segments; when adding the next would exceed maxChars, start a new segment.
 * - If a single non-FAQ article exceeds maxChars, sub-split with "Blog post: [Title]" / "Continued from..." headers.
 */
export function packArticlesIntoSegments(
  rows: RagContentRow[],
  maxCharsPerPart: number
): string[] {
  if (rows.length === 0) return [];
  const segments: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  function flushCurrent() {
    if (current.length > 0) {
      segments.push(current.join(ARTICLE_SEP));
      current = [];
      currentLen = 0;
    }
  }

  for (const row of rows) {
    const blob = buildArticleBlob(row);
    const typeSlug = row.type_slug ?? "";
    const isFaq = typeSlug === "faq";

    if (isFaq) {
      // FAQ: never split; whole blob in one segment.
      if (current.length > 0 && currentLen + ARTICLE_SEP.length + blob.length > maxCharsPerPart) {
        flushCurrent();
      }
      if (current.length > 0 && currentLen + ARTICLE_SEP.length + blob.length <= maxCharsPerPart) {
        current.push(blob);
        currentLen += ARTICLE_SEP.length + blob.length;
      } else {
        if (current.length > 0) flushCurrent();
        segments.push(blob);
      }
      continue;
    }

    // Non-FAQ: pack or sub-split.
    const needSep = current.length > 0;
    const addedLen = (needSep ? ARTICLE_SEP.length : 0) + blob.length;

    if (blob.length > maxCharsPerPart) {
      flushCurrent();
      const parts = splitArticleWithHeaders(blob, row.title, maxCharsPerPart);
      for (const part of parts) segments.push(part);
      continue;
    }

    if (currentLen + addedLen <= maxCharsPerPart) {
      if (needSep) current.push(ARTICLE_SEP);
      current.push(blob);
      currentLen += addedLen;
    } else {
      flushCurrent();
      current.push(blob);
      currentLen = blob.length;
    }
  }

  flushCurrent();
  return segments;
}

/**
 * Build one logical document string from RAG content rows (title, excerpt, body per item).
 * @deprecated Use packArticlesIntoSegments for article-based packing; kept for tests or fallback.
 */
export function buildRagDocument(rows: RagContentRow[]): string {
  return rows.map(buildArticleBlob).join(ARTICLE_SEP);
}

/**
 * Split a document into segments each under maxTokens (by character-boundary).
 * @deprecated Use packArticlesIntoSegments for article-based packing; kept for tests or fallback.
 */
export function splitIntoSegments(
  document: string,
  maxTokensPerPart: number = DEFAULT_MAX_TOKENS_PER_PART
): string[] {
  const maxChars = maxTokensPerPart * 4;
  if (!document || document.length <= maxChars) {
    return document ? [document] : [];
  }
  const segments: string[] = [];
  let remaining = document;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      segments.push(remaining);
      break;
    }
    const chunk = remaining.slice(0, maxChars);
    const lastNewline = chunk.lastIndexOf("\n");
    const splitAt = lastNewline > maxChars / 2 ? lastNewline + 1 : maxChars;
    segments.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n+/, "");
  }
  return segments;
}

export interface RagStats {
  totalChars: number;
  totalTokens: number;
  partCount: number;
  segments: string[];
}

/**
 * Server-only: get RAG feed stats and precomputed segments (for API and dashboard).
 * Uses article-based packing: whole articles in one URL; FAQ never split; oversize articles sub-split with headers.
 */
export async function getRagStats(
  maxTokensPerPart?: number
): Promise<RagStats> {
  const tokensPerPart = maxTokensPerPart ?? getMaxTokensPerPart();
  const maxCharsPerPart = tokensPerPart * 4;
  const rows = await getRagContentRows();
  const segments = packArticlesIntoSegments(rows, maxCharsPerPart);
  const fullDocument = rows.map(buildArticleBlob).join(ARTICLE_SEP);
  const totalChars = fullDocument.length;
  const totalTokens = estimateTokens(fullDocument);
  return {
    totalChars,
    totalTokens,
    partCount: segments.length,
    segments,
  };
}

/**
 * Base URL for RAG knowledge links (for dashboard copy). Prefer NEXT_PUBLIC_APP_URL, then Vercel.
 */
export function getRagBaseUrl(): string {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  if (app) return app.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}

/**
 * Get the RAG knowledge segment for a given 1-based part index.
 * Returns null if part is out of range.
 */
export async function getRagKnowledgePart(
  partNumber: number,
  maxTokensPerPart?: number
): Promise<string | null> {
  const { segments } = await getRagStats(maxTokensPerPart);
  const index = partNumber - 1;
  if (index < 0 || index >= segments.length) return null;
  return segments[index];
}
