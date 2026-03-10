/**
 * GET /api/shortcodes/media-list — list media for shortcode image picker.
 * Query: ?search= — filter by name, slug (uid), description, or taxonomy/tags.
 * Returns: { id, name, uid (slug), thumbnailUrl }[].
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMediaWithVariants, searchMedia, getMediaById } from "@/lib/supabase/media";
import { getMediaIdsWithTermMatching } from "@/lib/supabase/taxonomy";
import type { MediaWithVariants } from "@/types/media";

function toListItem(m: MediaWithVariants) {
  const thumb = m.variants?.find((v) => v.variant_type === "thumbnail");
  const url = thumb?.url ?? m.variants?.[0]?.url ?? null;
  return {
    id: m.id,
    name: m.name || m.id,
    uid: m.slug ?? m.id,
    thumbnailUrl: url,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    let media: Awaited<ReturnType<typeof getMediaWithVariants>>;
    if (search) {
      const [byText, termMediaIds] = await Promise.all([
        searchMedia(search),
        getMediaIdsWithTermMatching(search),
      ]);
      const byTextIds = new Set(byText.map((m) => m.id));
      const extraIds = termMediaIds.filter((id) => !byTextIds.has(id));
      const extra = await Promise.all(extraIds.map((id) => getMediaById(id)));
      const extraResolved = extra.filter((m): m is NonNullable<typeof m> => m != null);
      media = [...byText];
      for (const m of extraResolved) {
        if (!byTextIds.has(m.id)) media.push(m);
      }
    } else {
      media = await getMediaWithVariants();
    }

    const list = media.map(toListItem);
    return NextResponse.json(list);
  } catch (e) {
    console.warn("shortcodes/media-list:", e);
    return NextResponse.json(
      { error: "Failed to load media list" },
      { status: 500 }
    );
  }
}
