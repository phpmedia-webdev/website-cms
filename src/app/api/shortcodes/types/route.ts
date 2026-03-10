/**
 * GET /api/shortcodes/types — list shortcode types for universal picker (public library).
 * No auth required for read; used by editor. Returns from public.shortcode_types or fallback.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { SHORTCODE_TYPES_FALLBACK, type ShortcodeType } from "@/lib/shortcodes/types";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("shortcode_types")
      .select("id, slug, label, icon, has_picker, picker_type, display_order")
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("shortcode_types fetch failed, using fallback:", error.message);
      return NextResponse.json({ types: SHORTCODE_TYPES_FALLBACK });
    }

    const types: ShortcodeType[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      slug: row.slug as string,
      label: row.label as string,
      icon: (row.icon as string) ?? "",
      has_picker: Boolean(row.has_picker),
      picker_type: (row.picker_type as string) ?? null,
      display_order: Number(row.display_order) ?? 0,
    }));

    if (types.length === 0) {
      return NextResponse.json({ types: SHORTCODE_TYPES_FALLBACK });
    }

    return NextResponse.json({ types });
  } catch (e) {
    console.warn("shortcodes/types error:", e);
    return NextResponse.json({ types: SHORTCODE_TYPES_FALLBACK });
  }
}
