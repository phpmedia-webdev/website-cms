import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/posts
 * List published blog posts
 * Query params: page, limit, search
 */
async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from("posts")
      .select(`
        id,
        title,
        slug,
        excerpt,
        featured_image_id,
        published_at,
        created_at,
        updated_at,
        featured_image:media(id, url, alt_text)
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, {
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
