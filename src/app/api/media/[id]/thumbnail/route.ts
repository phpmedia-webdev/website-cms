/**
 * GET /api/media/[id]/thumbnail
 * Returns thumbnail URL for a media item (for featured image preview, etc.).
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
    const thumbnail = media.variants?.find((v) => v.variant_type === "thumbnail");
    const url = thumbnail?.url ?? media.variants?.[0]?.url ?? null;
    return NextResponse.json({ thumbnailUrl: url });
  } catch (e) {
    console.warn("media/[id]/thumbnail:", e);
    return NextResponse.json({ error: "Failed to get thumbnail" }, { status: 500 });
  }
}
