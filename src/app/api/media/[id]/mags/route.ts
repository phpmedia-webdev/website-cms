import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

/**
 * GET /api/media/[id]/mags
 * Get MAGs assigned to a media item.
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

    const { id: mediaId } = await params;
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { data, error } = await supabase
      .schema(schema)
      .from("media_mags")
      .select("mag_id")
      .eq("media_id", mediaId);

    if (error) {
      console.error("Media MAGs fetch error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch MAGs" },
        { status: 500 }
      );
    }

    const magIds = (data ?? []).map((row: { mag_id: string }) => row.mag_id);
    return NextResponse.json({ mag_ids: magIds });
  } catch (err) {
    console.error("Media MAGs GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/media/[id]/mags
 * Replace all MAGs for a media item.
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

    const { id: mediaId } = await params;
    const body = await request.json();
    const magIds: string[] = Array.isArray(body.mag_ids) ? body.mag_ids : [];

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { error: deleteError } = await supabase
      .schema(schema)
      .from("media_mags")
      .delete()
      .eq("media_id", mediaId);

    if (deleteError) {
      console.error("Media MAGs delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message ?? "Failed to clear MAGs" },
        { status: 500 }
      );
    }

    if (magIds.length > 0) {
      const rows = magIds.map((mag_id) => ({ media_id: mediaId, mag_id }));
      const { error: insertError } = await supabase
        .schema(schema)
        .from("media_mags")
        .insert(rows);

      if (insertError) {
        console.error("Media MAGs insert error:", insertError);
        return NextResponse.json(
          { error: insertError.message ?? "Failed to save MAGs" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, mag_ids: magIds });
  } catch (err) {
    console.error("Media MAGs PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
