import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

/**
 * GET /api/galleries/[id]/styles/[styleId]
 * Get single display style. Public (for renderer) or auth.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; styleId: string }> }
) {
  try {
    const { id: galleryId, styleId } = await params;
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { data, error } = await supabase
      .schema(schema)
      .from("gallery_display_styles")
      .select("*")
      .eq("id", styleId)
      .eq("gallery_id", galleryId)
      .maybeSingle();

    if (error) {
      console.error("Gallery display style fetch error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch style" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Style not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Gallery style GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/galleries/[id]/styles/[styleId]
 * Update display style. Requires auth.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; styleId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: galleryId, styleId } = await params;
    const body = await request.json();

    const validSortOrders = ["as_added", "name_asc", "name_desc", "date_newest", "date_oldest", "custom"];
    const {
      name,
      layout,
      columns,
      gap,
      size,
      cell_size,
      captions,
      lightbox,
      border,
      sort_order,
      slider_animation,
      slider_autoplay,
      slider_delay,
      slider_controls,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (layout !== undefined) {
      const validLayout = ["grid", "masonry", "slider"].includes(layout) ? layout : "grid";
      updateData.layout = validLayout;
      if (validLayout === "slider") {
        updateData.slider_animation = ["slide", "fade"].includes(slider_animation) ? slider_animation : "slide";
        updateData.slider_autoplay = Boolean(slider_autoplay);
        updateData.slider_delay = Math.min(30, Math.max(1, Number(slider_delay) || 5));
        updateData.slider_controls = ["arrows", "dots", "both", "none"].includes(slider_controls) ? slider_controls : "arrows";
      } else {
        updateData.slider_animation = null;
        updateData.slider_autoplay = null;
        updateData.slider_delay = null;
        updateData.slider_controls = null;
      }
    }
    if (columns !== undefined) updateData.columns = Math.min(6, Math.max(1, Number(columns) || 3));
    if (gap !== undefined) updateData.gap = ["sm", "md", "lg"].includes(gap) ? gap : "md";
    if (size !== undefined) updateData.size = ["thumbnail", "small", "medium", "large", "original"].includes(size) ? size : "medium";
    if (cell_size !== undefined) updateData.cell_size = ["xsmall", "small", "medium", "large", "xlarge"].includes(cell_size) ? cell_size : "medium";
    if (captions !== undefined) updateData.captions = Boolean(captions);
    if (lightbox !== undefined) updateData.lightbox = Boolean(lightbox);
    if (border !== undefined) updateData.border = ["none", "subtle", "frame"].includes(border) ? border : "none";
    if (sort_order !== undefined) updateData.sort_order = validSortOrders.includes(sort_order) ? sort_order : "as_added";

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { data, error } = await supabase
      .schema(schema)
      .from("gallery_display_styles")
      .update(updateData)
      .eq("id", styleId)
      .eq("gallery_id", galleryId)
      .select()
      .single();

    if (error) {
      console.error("Gallery display style update error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to update style" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Gallery style PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/galleries/[id]/styles/[styleId]
 * Delete display style. Requires auth.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; styleId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: galleryId, styleId } = await params;
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { error } = await supabase
      .schema(schema)
      .from("gallery_display_styles")
      .delete()
      .eq("id", styleId)
      .eq("gallery_id", galleryId);

    if (error) {
      console.error("Gallery display style delete error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to delete style" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Gallery style DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
