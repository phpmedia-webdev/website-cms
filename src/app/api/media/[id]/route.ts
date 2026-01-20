import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/media/[id]
 * Get a single media item by ID
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: media, error } = await supabase
      .from("media")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !media) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: media }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
