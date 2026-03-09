/**
 * Share-to-social / social links settings.
 * Stored in tenant settings under key "share_to_social". JSON blob: list of links (name, icon, url), order = array order.
 */

import { getSetting, setSetting } from "@/lib/supabase/settings";

export const SHARE_TO_SOCIAL_SETTINGS_KEY = "share_to_social";

/** Icon slug for each link. Social + generic options for custom links. */
export type SocialLinkIcon =
  | "twitter"
  | "facebook"
  | "linkedin"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "rss"
  | "link"
  | "external"
  | "mail"
  | "globe";

export interface SocialLinkItem {
  /** Optional stable id for list keys; generated on add if missing */
  id?: string;
  name: string;
  icon: SocialLinkIcon;
  url: string;
}

export interface ShareToSocialSettings {
  /** Order of array = display order. Each item: name, icon, url. */
  links: SocialLinkItem[];
  displayStyle: "horizontal" | "vertical";
  showLabels?: boolean;
}

/** All available icon options with display labels (for UI selector). */
export const SOCIAL_LINK_ICONS: { value: SocialLinkIcon; label: string }[] = [
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "rss", label: "RSS" },
  { value: "link", label: "Link (generic)" },
  { value: "external", label: "External" },
  { value: "mail", label: "Email" },
  { value: "globe", label: "Globe" },
];

const VALID_ICONS = new Set<SocialLinkIcon>(SOCIAL_LINK_ICONS.map((i) => i.value));

const DEFAULTS: ShareToSocialSettings = {
  links: [],
  displayStyle: "horizontal",
  showLabels: true,
};

function ensureId(item: SocialLinkItem): SocialLinkItem {
  if (item.id && typeof item.id === "string") return item;
  return { ...item, id: crypto.randomUUID?.() ?? `link-${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

function normalizeLinks(raw: unknown): SocialLinkItem[] {
  if (!Array.isArray(raw)) return [];
  const result: SocialLinkItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const url = typeof o.url === "string" ? o.url.trim() : "";
    let icon = typeof o.icon === "string" && VALID_ICONS.has(o.icon as SocialLinkIcon) ? (o.icon as SocialLinkIcon) : "link";
    result.push(ensureId({ id: typeof o.id === "string" ? o.id : undefined, name, icon, url }));
  }
  return result;
}

export async function getShareToSocialSettings(): Promise<ShareToSocialSettings> {
  const raw = await getSetting<Record<string, unknown>>(SHARE_TO_SOCIAL_SETTINGS_KEY);
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  // New format: links array
  if (Array.isArray(raw.links)) {
    return {
      links: normalizeLinks(raw.links),
      displayStyle: raw.displayStyle === "vertical" ? "vertical" : "horizontal",
      showLabels: typeof raw.showLabels === "boolean" ? raw.showLabels : true,
    };
  }
  // Legacy: old "buttons" format — return defaults so UI shows empty list; user can add new links
  return {
    links: [],
    displayStyle: raw.displayStyle === "vertical" ? "vertical" : "horizontal",
    showLabels: typeof raw.showLabels === "boolean" ? raw.showLabels : true,
  };
}

export async function setShareToSocialSettings(
  updates: Partial<ShareToSocialSettings>
): Promise<boolean> {
  const current = await getShareToSocialSettings();
  const next: ShareToSocialSettings = {
    ...current,
    ...(updates.links !== undefined && { links: normalizeLinks(updates.links) }),
    ...(updates.displayStyle !== undefined && {
      displayStyle: updates.displayStyle === "vertical" ? "vertical" : "horizontal",
    }),
    ...(updates.showLabels !== undefined && { showLabels: !!updates.showLabels }),
  };
  return setSetting(SHARE_TO_SOCIAL_SETTINGS_KEY, next);
}
