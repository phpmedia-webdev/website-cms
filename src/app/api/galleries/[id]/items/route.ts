import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

/**
 * GET /api/galleries/[id]/items
 * Fetch gallery items for editor. Returns items with media info and URLs.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: galleryId } = await params;
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { data: rows, error } = await supabase
      .schema(schema)
      .from("gallery_items")
      .select("id, gallery_id, media_id, position, caption")
      .eq("gallery_id", galleryId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Gallery items fetch error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch items" },
        { status: 500 }
      );
    }

    const mediaIds = (rows ?? []).map((r: { media_id?: string }) => r.media_id).filter(Boolean);
    const mediaMap = new Map<string, { id: string; name: string; slug: string; alt_text: string | null; original_filename: string; mime_type: string | null; media_type: string; created_at?: string }>();
    const urls = new Map<string, string>();

    if (mediaIds.length > 0) {
      const { data: mediaRows } = await supabase
        .schema(schema)
        .from("media")
        .select("id, name, slug, alt_text, original_filename, mime_type, media_type, created_at")
        .in("id", mediaIds);

      for (const m of mediaRows ?? []) {
        mediaMap.set(m.id, m);
      }

      const { data: variants } = await supabase
        .schema(schema)
        .from("media_variants")
        .select("media_id, url")
        .in("media_id", mediaIds)
        .in("variant_type", ["original", "large", "thumbnail"])
        .order("variant_type", { ascending: false });

      for (const v of variants ?? []) {
        if (!urls.has(v.media_id)) urls.set(v.media_id, v.url);
      }
    }

    const items = (rows ?? []).map((r: { id: string; gallery_id: string; media_id: string; position: number; caption: string | null }) => {
      const media = mediaMap.get(r.media_id);
      return {
        ...r,
        media: media
          ? {
              ...media,
              url: urls.get(r.media_id) ?? null,
              type: media.media_type ?? "image",
            }
          : null,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("API error fetching gallery items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/galleries/[id]/items
 * Add media items to a gallery. Body: { mediaIds: string[] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: galleryId } = await params;
    const body = await request.json();
    const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds : [];

    if (mediaIds.length === 0) {
      return NextResponse.json(
        { error: "mediaIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    // Get current max position
    const { data: existing } = await supabase
      .schema(schema)
      .from("gallery_items")
      .select("position")
      .eq("gallery_id", galleryId)
      .order("position", { ascending: false })
      .limit(1);

    const maxPosition =
      existing?.length && existing[0]?.position != null ? existing[0].position : -1;

    const inserts = mediaIds.map((mediaId: string, i: number) => ({
      gallery_id: galleryId,
      media_id: mediaId,
      position: maxPosition + 1 + i,
    }));

    const { data, error } = await supabase
      .schema(schema)
      .from("gallery_items")
      .insert(inserts)
      .select("id");

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "One or more items are already in this gallery" },
          { status: 409 }
        );
      }
      console.error("Gallery items insert error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to add items" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      added: data?.length ?? mediaIds.length,
    });
  } catch (error) {
    console.error("API error adding gallery items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/galleries/[id]/items
 * Reorder gallery items. Body: { orderedItemIds: string[] }
 * Sets all display styles for this gallery to sort_order = 'custom'.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: galleryId } = await params;
    const body = await request.json();
    const orderedItemIds = Array.isArray(body.orderedItemIds) ? body.orderedItemIds : [];

    if (orderedItemIds.length === 0) {
      return NextResponse.json(
        { error: "orderedItemIds array is required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    for (let i = 0; i < orderedItemIds.length; i++) {
      const { error } = await supabase
        .schema(schema)
        .from("gallery_items")
        .update({ position: i })
        .eq("id", orderedItemIds[i])
        .eq("gallery_id", galleryId);

      if (error) {
        console.error("Gallery item reorder error:", error);
        return NextResponse.json(
          { error: error.message ?? "Failed to reorder" },
          { status: 500 }
        );
      }
    }

    const { error: styleError } = await supabase
      .schema(schema)
      .from("gallery_display_styles")
      .update({ sort_order: "custom" })
      .eq("gallery_id", galleryId);

    if (styleError) {
      console.error("Gallery display styles sort_order update error:", styleError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error reordering gallery items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/galleries/[id]/items
 * Remove an item from the gallery. Body: { itemId: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: galleryId } = await params;
    const body = await request.json();
    const itemId = body?.itemId;

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { error } = await supabase
      .schema(schema)
      .from("gallery_items")
      .delete()
      .eq("id", itemId)
      .eq("gallery_id", galleryId);

    if (error) {
      console.error("Gallery item delete error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to remove item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error removing gallery item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
