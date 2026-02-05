/**
 * View as Role + Site: superadmin testing mode.
 * Cookie stores tenant site id + role slug; layout overrides effective features for sidebar/guards.
 */

export const VIEW_AS_COOKIE_NAME = "view_as";

/** Cookie value format: siteId|roleSlug */
const SEP = "|";

export function parseViewAsCookie(value: string | undefined): { siteId: string; roleSlug: string } | null {
  if (!value?.trim()) return null;
  const parts = value.trim().split(SEP);
  if (parts.length !== 2) return null;
  const [siteId, roleSlug] = parts;
  if (!siteId?.trim() || !roleSlug?.trim()) return null;
  return { siteId: siteId.trim(), roleSlug: roleSlug.trim() };
}

export function getViewAsFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined }
): { siteId: string; roleSlug: string } | null {
  const value = cookieStore.get(VIEW_AS_COOKIE_NAME)?.value;
  return parseViewAsCookie(value);
}

export function viewAsCookieValue(siteId: string, roleSlug: string): string {
  return `${siteId}${SEP}${roleSlug}`;
}
