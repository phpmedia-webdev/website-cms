import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getAllColorPalettes, createColorPalette } from "@/lib/supabase/color-palettes";
import type { ColorPalettePayload } from "@/types/color-palette";

/**
 * GET /api/admin/color-palettes
 * Get all color palettes
 */
export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (user.metadata.type !== "admin" && user.metadata.type !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const palettes = await getAllColorPalettes();
    
    console.log("API: Fetched palettes count:", palettes.length);

    return NextResponse.json({
      success: true,
      palettes,
    });
  } catch (error: any) {
    console.error("API Error fetching color palettes:", {
      error,
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: error?.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/color-palettes
 * Create a new custom color palette
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (user.metadata.type !== "admin" && user.metadata.type !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const payload = body as ColorPalettePayload;

    // Validate required fields
    if (!payload.name || !payload.colors) {
      return NextResponse.json(
        { error: "Name and colors are required" },
        { status: 400 }
      );
    }

    const palette = await createColorPalette(payload);

    if (!palette) {
      return NextResponse.json(
        { error: "Failed to create color palette" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      palette,
    });
  } catch (error: any) {
    console.error("Error creating color palette:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
