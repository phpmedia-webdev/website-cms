import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  getCustomizerOptions,
  setCustomizerOptions,
  type CustomizerOptionRowServer,
} from "@/lib/supabase/settings";

/**
 * GET /api/settings/customizer?scope=project_type
 * Get customizer options for a scope (authenticated).
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    if (!scope || typeof scope !== "string" || !scope.trim()) {
      return NextResponse.json(
        { error: "scope query parameter is required" },
        { status: 400 }
      );
    }
    const items = await getCustomizerOptions(scope.trim());
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching customizer options:", error);
    return NextResponse.json(
      { error: "Failed to fetch customizer options" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/customizer
 * Body: { scope: string, items: CustomizerOptionRowServer[] }
 * Update customizer options for a scope (authenticated).
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const scope = body.scope;
    if (!scope || typeof scope !== "string" || !scope.trim()) {
      return NextResponse.json(
        { error: "scope is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "items must be an array" },
        { status: 400 }
      );
    }
    const items = body.items as CustomizerOptionRowServer[];
    const valid = items.every(
      (i) =>
        i &&
        typeof i.slug === "string" &&
        typeof i.label === "string" &&
        (i.color === undefined || i.color === null || typeof i.color === "string") &&
        (i.is_core === undefined || typeof i.is_core === "boolean")
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Each item must have slug and label; color and is_core optional" },
        { status: 400 }
      );
    }
    const success = await setCustomizerOptions(scope.trim(), items);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to save customizer options" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating customizer options:", error);
    return NextResponse.json(
      { error: "Failed to update customizer options" },
      { status: 500 }
    );
  }
}
