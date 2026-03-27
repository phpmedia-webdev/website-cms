/**
 * Optional date window for admin Message Center stream queries (inclusive bounds in UTC).
 */

export type MessageCenterDateRangeIso = {
  dateFrom?: string;
  dateTo?: string;
};

/** True if any boundary is set after normalization. */
export function hasMessageCenterDateRange(r: MessageCenterDateRangeIso | null | undefined): boolean {
  return !!(r?.dateFrom?.trim() || r?.dateTo?.trim());
}

/**
 * Normalize URL/query params into ISO strings for Supabase `.gte` / `.lte`.
 * Accepts `YYYY-MM-DD` or full ISO. End date is end-of-day UTC when given as date-only.
 */
export function normalizeMessageCenterDateRange(
  dateFromRaw?: string | null,
  dateToRaw?: string | null
): MessageCenterDateRangeIso | null {
  const fromIn = dateFromRaw?.trim() || "";
  const toIn = dateToRaw?.trim() || "";
  if (!fromIn && !toIn) return null;

  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  if (fromIn) {
    dateFrom = fromIn.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(fromIn) ? `${fromIn}T00:00:00.000Z` : fromIn;
  }
  if (toIn) {
    if (toIn.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(toIn)) {
      const [y, m, d] = toIn.split("-").map((p) => parseInt(p, 10));
      dateTo = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
    } else {
      dateTo = toIn;
    }
  }

  if (dateFrom && dateTo && new Date(dateFrom).getTime() > new Date(dateTo).getTime()) {
    return null;
  }

  return { dateFrom, dateTo };
}

/** Filter stream item timestamps (ISO) to the same inclusive window. */
export function messageCenterItemInDateRange(
  atIso: string,
  range: MessageCenterDateRangeIso | null
): boolean {
  if (!range || (!range.dateFrom && !range.dateTo)) return true;
  const t = new Date(atIso).getTime();
  if (Number.isNaN(t)) return true;
  if (range.dateFrom && t < new Date(range.dateFrom).getTime()) return false;
  if (range.dateTo && t > new Date(range.dateTo).getTime()) return false;
  return true;
}

export function messageCenterFetchCap(baseCap: number, _range: MessageCenterDateRangeIso | null): number {
  return Math.min(Math.max(baseCap, 1), 500);
}
