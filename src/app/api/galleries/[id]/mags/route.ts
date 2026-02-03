import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

/**
 * GET /api/galleries/[id]/mags
 * Get MAGs assigned to a gallery.
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

    const { data, error } = await supabase
      .schema(schema)
      .from("gallery_mags")
      .select("mag_id")
      .eq("gallery_id", galleryId);

    if (error) {
      console.error("Gallery MAGs fetch error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch MAGs" },
        { status: 500 }
      );
    }

    const magIds = (data ?? []).map((row: { mag_id: string }) => row.mag_id);
    return NextResponse.json({ mag_ids: magIds });
  } catch (err) {
    console.error("Gallery MAGs GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/galleries/[id]/mags
 * Replace all MAGs for a gallery.
 * Body: { mag_ids: string[] }
 */
export async function PUT(
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
    const magIds: string[] = Array.isArray(body.mag_ids) ? body.mag_ids : [];

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    // Delete existing
    const { error: deleteError } = await supabase
      .schema(schema)
      .from("gallery_mags")
      .delete()
      .eq("gallery_id", galleryId);

    if (deleteError) {
      console.error("Gallery MAGs delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message ?? "Failed to clear MAGs" },
        { status: 500 }
      );
    }

    // Insert new
    if (magIds.length > 0) {
      const rows = magIds.map((mag_id) => ({ gallery_id: galleryId, mag_id }));
      const { error: insertError } = await supabase
        .schema(schema)
        .from("gallery_mags")
        .insert(rows);

      if (insertError) {
        console.error("Gallery MAGs insert error:", insertError);
        return NextResponse.json(
          { error: insertError.message ?? "Failed to save MAGs" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, mag_ids: magIds });
  } catch (err) {
    console.error("Gallery MAGs PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
