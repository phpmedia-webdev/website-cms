import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * GET /api/galleries/[id]
 * Get a single gallery with all items by ID or slug
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get gallery
    const { data: gallery, error: galleryError } = await supabase
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
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (galleryError || !gallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    // Get gallery items
    const { data: items, error: itemsError } = await supabase
      .from("gallery_items")
      .select(`
        id,
        position,
        caption,
        media:media(
          id,
          type,
          url,
          provider,
          alt_text,
          caption,
          width,
          height
        )
      `)
      .eq("gallery_id", gallery.id)
      .order("position", { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          ...gallery,
          items: items || [],
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
