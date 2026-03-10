/**
 * GET /api/shortcodes/types — list shortcode types for universal picker.
 * Returns canonical list: Image, Gallery, Content, Button, Separator, Section Break, Spacer, Clear, Layout.
 */

import { NextResponse } from "next/server";
import { SHORTCODE_TYPES_FALLBACK } from "@/lib/shortcodes/types";

export async function GET() {
  try {
    return NextResponse.json({ types: SHORTCODE_TYPES_FALLBACK });
  } catch (e) {
    console.warn("shortcodes/types error:", e);
    return NextResponse.json({ types: SHORTCODE_TYPES_FALLBACK });
  }
}
