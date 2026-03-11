/**
 * GET /api/settings/form-styles — list form styles (for shortcode picker and Style → Forms).
 * PATCH /api/settings/form-styles — save form styles (body: { styles: FormStyle[] }).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getFormStyles, setFormStyles } from "@/lib/supabase/settings";
import type { FormStyle } from "@/types/design-system";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const styles = await getFormStyles();
    return NextResponse.json(styles);
  } catch (e) {
    console.error("GET /api/settings/form-styles:", e);
    return NextResponse.json(
      { error: "Failed to load form styles" },
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
    const styles = body.styles as FormStyle[] | undefined;
    if (!Array.isArray(styles)) {
      return NextResponse.json(
        { error: "Body must include styles array" },
        { status: 400 }
      );
    }
    const valid: FormStyle[] = styles.filter(
      (s) => s && typeof s.slug === "string" && typeof s.label === "string"
    );
    const ok = await setFormStyles(valid);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save form styles" },
        { status: 500 }
      );
    }
    return NextResponse.json(valid);
  } catch (e) {
    console.error("PATCH /api/settings/form-styles:", e);
    return NextResponse.json(
      { error: "Failed to save form styles" },
      { status: 500 }
    );
  }
}
