/**
 * GET /api/shortcodes/media/[id] — resolve media for shortcode render (url, alt).
 * Returns first variant URL for embedding in content.
 */

import { NextResponse } from "next/server";
import { getMediaById } from "@/lib/supabase/media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const media = await getMediaById(id);
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    const url = media.variants?.[0]?.url ?? null;
    const alt = media.alt_text ?? media.name ?? "";
    return NextResponse.json({ url, alt });
  } catch (e) {
    console.warn("shortcodes/media/[id]:", e);
    return NextResponse.json({ error: "Failed to resolve media" }, { status: 500 });
  }
}
