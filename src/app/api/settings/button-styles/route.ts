/**
 * GET /api/settings/button-styles — list button styles (for shortcode picker and Style → Buttons).
 * PATCH /api/settings/button-styles — save button styles (body: { styles: ButtonStyle[] }).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getButtonStyles, setButtonStyles } from "@/lib/supabase/settings";
import type { ButtonStyle } from "@/types/design-system";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const styles = await getButtonStyles();
    return NextResponse.json(styles);
  } catch (e) {
    console.error("GET /api/settings/button-styles:", e);
    return NextResponse.json(
      { error: "Failed to load button styles" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const styles = body.styles as ButtonStyle[] | undefined;
    if (!Array.isArray(styles)) {
      return NextResponse.json(
        { error: "Body must include styles array" },
        { status: 400 }
      );
    }
    const valid: ButtonStyle[] = styles.filter(
      (s) => s && typeof s.slug === "string" && typeof s.label === "string" && typeof s.className === "string"
    );
    const ok = await setButtonStyles(valid);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save button styles" },
        { status: 500 }
      );
    }
    return NextResponse.json(valid);
  } catch (e) {
    console.error("PATCH /api/settings/button-styles:", e);
    return NextResponse.json(
      { error: "Failed to save button styles" },
      { status: 500 }
    );
  }
}
