import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/galleries
 * List all galleries
 */
async function handler(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: galleries, error } = await supabase
      .from("galleries")
      .select(`
        id,
        name,
        slug,
        description,
        cover_image_id,
        created_at,
        updated_at,
        cover_image:media(id, url, alt_text)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: galleries || [] }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
