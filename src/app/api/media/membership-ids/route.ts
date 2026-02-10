import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMagIdsOnMedia } from "@/lib/mags/content-protection";

/**
 * GET /api/media/membership-ids?ids=uuid1,uuid2,...
 * Returns media IDs that have at least one membership (row in media_mags).
 * Used by media library to show membership badges.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const mediaIds = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (mediaIds.length === 0) {
      return NextResponse.json({ media_ids: [] });
    }

    const magIdsByMedia = await getMagIdsOnMedia(mediaIds);
    const mediaIdsWithMembership = mediaIds.filter(
      (id) => (magIdsByMedia.get(id) ?? []).length > 0
    );

    return NextResponse.json({ media_ids: mediaIdsWithMembership });
  } catch (err) {
    console.error("Media membership-ids API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
