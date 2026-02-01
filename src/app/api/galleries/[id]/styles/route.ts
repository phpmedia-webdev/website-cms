import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

/**
 * GET /api/galleries/[id]/styles
 * List display styles for a gallery. Requires auth.
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
      .from("gallery_display_styles")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Gallery display styles fetch error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch styles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ styles: data ?? [] });
  } catch (err) {
    console.error("Gallery styles GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/galleries/[id]/styles
 * Create a new display style. Requires auth.
 * Body: { name, layout, columns, gap, size, captions, lightbox, border, slider_animation?, slider_autoplay?, slider_delay?, slider_controls? }
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

    const validSortOrders = ["as_added", "name_asc", "name_desc", "date_newest", "date_oldest", "custom"];
    const {
      name,
      layout = "grid",
      columns = 3,
      gap = "md",
      size = "medium",
      cell_size = "medium",
      captions = true,
      lightbox = true,
      border = "none",
      sort_order = "as_added",
      slider_animation,
      slider_autoplay = false,
      slider_delay = 5,
      slider_controls = "arrows",
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const insertData: Record<string, unknown> = {
      gallery_id: galleryId,
      name: name.trim(),
      layout: ["grid", "masonry", "slider"].includes(layout) ? layout : "grid",
      columns: Math.min(6, Math.max(1, Number(columns) || 3)),
      gap: ["sm", "md", "lg"].includes(gap) ? gap : "md",
      size: ["thumbnail", "small", "medium", "large", "original"].includes(size) ? size : "medium",
      cell_size: ["xsmall", "small", "medium", "large", "xlarge"].includes(cell_size) ? cell_size : "medium",
      captions: Boolean(captions),
      lightbox: Boolean(lightbox),
      border: ["none", "subtle", "frame"].includes(border) ? border : "none",
      sort_order: validSortOrders.includes(sort_order) ? sort_order : "as_added",
    };

    if (layout === "slider") {
      insertData.slider_animation = ["slide", "fade"].includes(slider_animation) ? slider_animation : "slide";
      insertData.slider_autoplay = Boolean(slider_autoplay);
      insertData.slider_delay = Math.min(30, Math.max(1, Number(slider_delay) || 5));
      insertData.slider_controls = ["arrows", "dots", "both", "none"].includes(slider_controls) ? slider_controls : "arrows";
    } else {
      insertData.slider_animation = null;
      insertData.slider_autoplay = null;
      insertData.slider_delay = null;
      insertData.slider_controls = null;
    }

    const { data, error } = await supabase
      .schema(schema)
      .from("gallery_display_styles")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Gallery display style create error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to create style" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Gallery styles POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
