/**
 * Parse all shortcodes from HTML string. Returns segments in order (html | shortcode).
 * Used by content renderer to split and render each part.
 * Alignment is read from the containing block (e.g. <p style="text-align: center">) so the front end can preserve it.
 */

export type TextAlignValue = "left" | "center" | "right" | "justify";

export type ShortcodePart =
  | { type: "html"; value: string }
  | { type: "gallery"; match: string; galleryId: string; styleId: string | null; alignment?: TextAlignValue }
  | { type: "media"; match: string; mediaId: string; size?: string; alignment?: TextAlignValue }
  | { type: "separator"; match: string; alignment?: TextAlignValue }
  | { type: "section_break"; match: string; alignment?: TextAlignValue }
  | { type: "spacer"; match: string; size?: string; alignment?: TextAlignValue }
  | { type: "clear"; match: string; alignment?: TextAlignValue }
  | { type: "button"; match: string; label: string; url: string; style: string; alignment?: TextAlignValue }
  | { type: "form"; match: string; formId: string; styleSlug?: string; alignment?: TextAlignValue }
  | { type: "snippet"; match: string; snippetId: string; alignment?: TextAlignValue }
  | { type: "layout"; match: string; widths: string; heightPx: number; columnContents: string[]; alignment?: TextAlignValue };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Match [[...]] */
const BRACKET_REGEX = /\[\[([^\]]+)\]\]/g;

function parseOne(match: string): ShortcodePart | null {
  const inner = match.slice(2, -2).trim();
  const colon = inner.indexOf(":");
  const type = colon >= 0 ? inner.slice(0, colon).trim().toLowerCase() : "";
  const rest = colon >= 0 ? inner.slice(colon + 1).trim() : inner;

  if (type === "gallery") {
    const parts = rest.split(",").map((s) => s.trim());
    const galleryId = parts[0];
    const styleId = parts[1] ?? null;
    if (galleryId && UUID_REGEX.test(galleryId) && (styleId === null || UUID_REGEX.test(styleId))) {
      return { type: "gallery", match, galleryId, styleId };
    }
    return null;
  }
  if (type === "media") {
    const segments = rest.split("|").map((s) => s.trim()).filter(Boolean);
    const id = segments[0];
    if (!id || !UUID_REGEX.test(id)) return null;
    let size: string | undefined;
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      const eq = seg.indexOf("=");
      if (eq >= 0) {
        const key = seg.slice(0, eq).trim().toLowerCase();
        const val = seg.slice(eq + 1).trim();
        if (key === "size" && val) size = val.toLowerCase();
      } else if (!size) {
        size = seg.toLowerCase();
      }
    }
    return { type: "media", match, mediaId: id, size: size || undefined };
  }
  if (type === "button") {
    const parts = rest.split("|").map((s) => s.trim());
    const [label, url, style] = parts;
    if (label && url) {
      return { type: "button", match, label, url, style: style || "primary" };
    }
    return null;
  }
  if (type === "form") {
    const segments = rest.split("|").map((s) => s.trim()).filter(Boolean);
    const formId = segments[0];
    if (!formId) return null;
    let styleSlug: string | undefined;
    for (let i = 1; i < segments.length; i++) {
      const eq = segments[i].indexOf("=");
      if (eq >= 0) {
        const key = segments[i].slice(0, eq).trim().toLowerCase();
        const val = segments[i].slice(eq + 1).trim();
        if (key === "style" && val) styleSlug = val;
      }
    }
    return { type: "form", match, formId, ...(styleSlug && { styleSlug }) };
  }
  if (type === "snippet") {
    const snippetId = rest.trim();
    if (snippetId) {
      return { type: "snippet", match, snippetId };
    }
    return null;
  }

  /** Column delimiter used inside [[layout|...]] (must match LayoutWizardModal COL_DELIM). */
  const LAYOUT_COL_DELIM = "{{COL}}";
  if (type === "layout") {
    const segments = rest.split("|").map((s) => s.trim());
    if (segments.length >= 3) {
      const [widths, heightStr, encodedCols] = segments;
      const heightPx = parseInt(heightStr ?? "", 10) || 150;
      const columnContents = (encodedCols ?? "").split(LAYOUT_COL_DELIM).map((s) => s.trim());
      if (widths) {
        return { type: "layout", match, widths, heightPx, columnContents };
      }
    }
    return null;
  }

  const simple = inner.toLowerCase().replace(/-/g, "_");
  if (simple === "separator") return { type: "separator", match };
  if (simple === "section_break" || simple === "section:full") return { type: "section_break", match };
  if (simple === "spacer") return { type: "spacer", match };
  const spacerSize = /^spacer\s*\|\s*(\w+)$/i.exec(inner);
  if (spacerSize) return { type: "spacer", match, size: spacerSize[1] };
  if (simple === "clear") return { type: "clear", match };

  return null;
}

/** Extract text-align from the nearest block tag (p, div) before index in html. Tiptap TextAlign outputs style="text-align: center". */
function getAlignmentBeforeIndex(html: string, index: number): TextAlignValue | undefined {
  const before = html.slice(0, index);
  const blockMatch = before.match(/<(p|div)(?:\s[^>]*)?>/gi);
  if (!blockMatch || blockMatch.length === 0) return undefined;
  const lastBlock = blockMatch[blockMatch.length - 1];
  const styleMatch = lastBlock.match(/style\s*=\s*["']([^"']*)["']/i);
  if (!styleMatch) return undefined;
  const alignMatch = styleMatch[1].match(/text-align\s*:\s*(\w+)/i);
  if (!alignMatch) return undefined;
  const v = alignMatch[1].toLowerCase();
  if (v === "left" || v === "center" || v === "right" || v === "justify") return v as TextAlignValue;
  return undefined;
}

/**
 * Find all shortcodes in HTML and return ordered parts (html and shortcode).
 * Shortcode parts include alignment when the containing block has text-align (from Tiptap).
 */
export function findAllShortcodes(html: string): ShortcodePart[] {
  const parts: ShortcodePart[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(BRACKET_REGEX.source, "g");
  while ((m = re.exec(html)) !== null) {
    const match = m[0];
    const index = m.index;
    if (index > lastEnd) {
      parts.push({ type: "html", value: html.slice(lastEnd, index) });
    }
    const parsed = parseOne(match);
    if (parsed) {
      const alignment = getAlignmentBeforeIndex(html, index);
      parts.push({ ...parsed, ...(alignment && { alignment }) });
    } else {
      parts.push({ type: "html", value: match });
    }
    lastEnd = index + match.length;
  }
  if (lastEnd < html.length) {
    parts.push({ type: "html", value: html.slice(lastEnd) });
  }
  return parts;
}
