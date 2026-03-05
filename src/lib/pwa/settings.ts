/**
 * PWA manifest and install settings.
 * Stored in tenant settings under key "pwa". Used by manifest and General Settings UI.
 */

import { getSetting, setSetting, getSiteUrl } from "@/lib/supabase/settings";
import { getMediaById } from "@/lib/supabase/media";

export const PWA_SETTINGS_KEY = "pwa";

export interface PwaSettings {
  /** App name (e.g. "Site Status") */
  name?: string;
  /** Short name for home screen (e.g. "Status") */
  short_name?: string;
  /** Theme color (e.g. "#0f172a") */
  theme_color?: string;
  /** Background color (e.g. "#ffffff") */
  background_color?: string;
  /** Media library item ID for PWA / install icon (and optional favicon). */
  icon_media_id?: string;
  /** Optional direct image URL; used if set, else icon_media_id is resolved. */
  icon_url?: string;
}

const DEFAULTS: PwaSettings = {
  name: "Site Status",
  short_name: "Status",
  theme_color: "#0f172a",
  background_color: "#ffffff",
};

export async function getPwaSettings(): Promise<PwaSettings> {
  const raw = await getSetting<PwaSettings>(PWA_SETTINGS_KEY);
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  return {
    ...DEFAULTS,
    ...(typeof raw.name === "string" && { name: raw.name }),
    ...(typeof raw.short_name === "string" && { short_name: raw.short_name }),
    ...(typeof raw.theme_color === "string" && { theme_color: raw.theme_color }),
    ...(typeof raw.background_color === "string" && { background_color: raw.background_color }),
    ...(typeof raw.icon_media_id === "string" && raw.icon_media_id && { icon_media_id: raw.icon_media_id }),
    ...(typeof raw.icon_url === "string" && raw.icon_url && { icon_url: raw.icon_url }),
  };
}

export async function setPwaSettings(updates: Partial<PwaSettings>): Promise<boolean> {
  const current = await getPwaSettings();
  const next: PwaSettings = {
    ...current,
    ...(updates.name !== undefined && { name: updates.name?.trim() || DEFAULTS.name }),
    ...(updates.short_name !== undefined && { short_name: updates.short_name?.trim() || DEFAULTS.short_name }),
    ...(updates.theme_color !== undefined && { theme_color: updates.theme_color?.trim() || DEFAULTS.theme_color }),
    ...(updates.background_color !== undefined && { background_color: updates.background_color?.trim() || DEFAULTS.background_color }),
    ...(updates.icon_media_id !== undefined && { icon_media_id: updates.icon_media_id?.trim() || undefined }),
    ...(updates.icon_url !== undefined && { icon_url: updates.icon_url?.trim() || undefined }),
  };
  return setSetting(PWA_SETTINGS_KEY, next);
}

/**
 * Resolve the icon URL for the manifest: use icon_url if set, else resolve icon_media_id via media library.
 * Returns absolute URL for the image (same URL can be used for 192 and 512 in manifest).
 */
export async function getPwaIconUrl(settings: PwaSettings): Promise<string | null> {
  if (settings.icon_url?.trim()) {
    const u = settings.icon_url.trim();
    return u.startsWith("http") ? u : null;
  }
  const id = settings.icon_media_id?.trim();
  if (!id) return null;

  try {
    const media = await getMediaById(id);
    if (!media) return null;
    const url =
      (media.media_type === "video" && media.video_url?.trim()) ||
      (media.variants?.length && media.variants[0]?.url?.trim()) ||
      "";
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const base = await getSiteUrl();
    if (!base) return url;
    return url.startsWith("/") ? `${base.replace(/\/$/, "")}${url}` : `${base}/${url}`;
  } catch {
    return null;
  }
}
