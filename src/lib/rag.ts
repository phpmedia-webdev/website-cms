/**
 * RAG Knowledge Export: assemble content marked "Use for Agent Training" into a single
 * document (or segments under a token limit) for chatbot training.
 * Server-only: uses createServerSupabaseClient.
 */

import { createServerSupabaseClient } from "@/lib/supabase/client";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** Max tokens per part (segment). Many bots use 8k–16k; 8k is a safe default. */
export const DEFAULT_MAX_TOKENS_PER_PART = 8000;

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
}

/**
 * Server-only: fetch content rows for RAG feed.
 * Only includes content that is: use_for_agent_training = true, status = 'published',
 * and PUBLIC (access_level is null or 'public', required_mag_id is null).
 * Membership-protected content is never included in the feed.
 */
export async function getRagContentRows(): Promise<RagContentRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content")
    .select("id, title, slug, body, excerpt, updated_at")
    .eq("use_for_agent_training", true)
    .eq("status", "published")
    .or("access_level.is.null,access_level.eq.public")
    .is("required_mag_id", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getRagContentRows:", error);
    return [];
  }
  return (data as RagContentRow[]) ?? [];
}

/**
 * Build one logical document string from RAG content rows (title, excerpt, body per item).
 */
export function buildRagDocument(rows: RagContentRow[]): string {
  const blocks: string[] = [];
  for (const row of rows) {
    const bodyText = tiptapToPlainText(row.body);
    const excerpt = (row.excerpt || "").trim();
    const parts = [`# ${row.title}`];
    if (excerpt) parts.push(excerpt);
    if (bodyText) parts.push(bodyText);
    blocks.push(parts.join("\n\n"));
  }
  return blocks.join("\n\n---\n\n");
}

/**
 * Split a document into segments each under maxTokens (by character-boundary).
 * Returns array of segment strings.
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
 */
export async function getRagStats(
  maxTokensPerPart: number = DEFAULT_MAX_TOKENS_PER_PART
): Promise<RagStats> {
  const rows = await getRagContentRows();
  const document = buildRagDocument(rows);
  const totalChars = document.length;
  const totalTokens = estimateTokens(document);
  const segments = splitIntoSegments(document, maxTokensPerPart);
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
  maxTokensPerPart: number = DEFAULT_MAX_TOKENS_PER_PART
): Promise<string | null> {
  const { segments } = await getRagStats(maxTokensPerPart);
  const index = partNumber - 1;
  if (index < 0 || index >= segments.length) return null;
  return segments[index];
}
