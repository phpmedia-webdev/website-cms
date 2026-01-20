import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/posts/[id]
 * Get a single published post by ID or slug
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Try to find by ID first, then by slug
    let query = supabase
      .from("posts")
      .select(`
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image_id,
        published_at,
        created_at,
        updated_at,
        featured_image:media(id, url, alt_text, caption)
      `)
      .eq("status", "published")
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    const { data: post, error } = await query;

    if (error || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: post }, {
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
