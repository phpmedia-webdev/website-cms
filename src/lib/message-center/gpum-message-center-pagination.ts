/**
 * GPUM message center keyset pagination (server-only — uses Buffer).
 * Import only from API routes or server modules.
 */

import { Buffer } from "node:buffer";
import {
  compareMemberStreamItemsNewestFirst,
  sortMemberStreamItemsNewestFirst,
  type MemberMessageCenterStreamItem,
} from "@/lib/message-center/gpum-message-center";

const CURSOR_VERSION = 1;

export type MemberMessageCenterCursorPayload = { v: number; at: string; id: string };

export function encodeMemberMessageCenterCursor(payload: {
  at: string;
  id: string;
}): string {
  const raw = JSON.stringify({
    v: CURSOR_VERSION,
    at: payload.at,
    id: payload.id,
  } satisfies MemberMessageCenterCursorPayload);
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeMemberMessageCenterCursor(
  cursor: string | null | undefined
): MemberMessageCenterCursorPayload | null {
  const s = cursor?.trim();
  if (!s) return null;
  try {
    const json = Buffer.from(s, "base64url").toString("utf8");
    const o = JSON.parse(json) as MemberMessageCenterCursorPayload;
    if (o?.v !== CURSOR_VERSION || typeof o.at !== "string" || typeof o.id !== "string") return null;
    if (!o.at.trim() || !o.id.trim()) return null;
    return o;
  } catch {
    return null;
  }
}

/**
 * Keyset page over a pre-filtered list. Newest first; `cursor` encodes the last item of the previous page (`at` + `id`).
 */
export function paginateMemberStreamItems(
  items: MemberMessageCenterStreamItem[],
  limit: number,
  cursorParam: string | null | undefined
): {
  streamItems: MemberMessageCenterStreamItem[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const cap = Math.min(Math.max(limit, 1), 200);
  const sorted = sortMemberStreamItemsNewestFirst(items);
  const cur = decodeMemberMessageCenterCursor(cursorParam);
  let start = 0;
  if (cur) {
    const idx = sorted.findIndex((x) => compareMemberStreamItemsNewestFirst(cur, x) < 0);
    start = idx === -1 ? sorted.length : idx;
  }
  const streamItems = sorted.slice(start, start + cap);
  const hasMore = start + cap < sorted.length;
  const last = streamItems[streamItems.length - 1];
  const nextCursor =
    hasMore && last != null
      ? encodeMemberMessageCenterCursor({ at: last.at, id: last.id })
      : null;
  return { streamItems, nextCursor, hasMore };
}
