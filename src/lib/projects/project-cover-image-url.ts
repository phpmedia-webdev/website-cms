import type { MediaWithVariants } from "@/types/media";

/** Prefer thumbnail variant URL for project cover display. */
export function projectCoverImageUrlFromMedia(media: MediaWithVariants | null): string | null {
  if (!media || media.media_type !== "image") return null;
  const thumb = media.variants.find((v) => v.variant_type === "thumbnail");
  const orig = media.variants.find((v) => v.variant_type === "original");
  return thumb?.url || orig?.url || null;
}
