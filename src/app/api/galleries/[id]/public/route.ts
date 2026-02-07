import { NextResponse } from "next/server";
import {
  getGalleryForPublic,
  getGalleryAccessInfo,
} from "@/lib/supabase/galleries-server";
import { checkGalleryAccess } from "@/lib/auth/gallery-access";
import {
  getMagUidsForCurrentUser,
  filterMediaByMagTagAccess,
} from "@/lib/mags/content-protection";
import type { UserMetadata } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";

/**
 * GET /api/galleries/[id]/public?styleId=xxx
 * Gallery data for embedding. Respects gallery-level and per-media (MAG tag) membership protection.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galleryId } = await params;
    const { searchParams } = new URL(request.url);
    const styleId = searchParams.get("styleId") || null;

    const accessInfo = await getGalleryAccessInfo(galleryId);
    if (!accessInfo) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const accessResult = await checkGalleryAccess(accessInfo);
    if (!accessResult.hasAccess) {
      return NextResponse.json(
        {
          error: "Access denied",
          restricted: true,
          message:
            accessResult.visibilityMode === "message"
              ? accessResult.restrictedMessage ?? "This gallery is restricted."
              : undefined,
        },
        { status: 403 }
      );
    }

    const data = await getGalleryForPublic(galleryId, styleId);
    if (!data) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const supabase = await createServerSupabaseClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    const metadata = user?.user_metadata as UserMetadata | undefined;
    const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";

    const items = isAdmin
      ? data.items
      : await (async () => {
          const userMagUids = await getMagUidsForCurrentUser();
          const mediaIds = data.items.map((i) => i.media_id);
          const allowedMediaIds = await filterMediaByMagTagAccess(mediaIds, userMagUids);
          const allowedSet = new Set(allowedMediaIds);
          return data.items.filter((i) => allowedSet.has(i.media_id));
        })();

    return NextResponse.json(
      { ...data, items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("Gallery public API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
