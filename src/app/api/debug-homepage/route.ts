/**
 * Debug: fetch homepage and return raw data.
 * GET /api/debug-homepage
 * Remove this file after debugging.
 */
import { NextResponse } from "next/server";
import { getPublishedContentByTypeAndSlug } from "@/lib/supabase/content";

export async function GET() {
  try {
    const page = await getPublishedContentByTypeAndSlug("page", "/");

    if (!page) {
      return NextResponse.json({
        found: false,
        message: "No homepage (slug=/) found",
      });
    }

    return NextResponse.json({
      found: true,
      title: page.title,
      slug: page.slug,
      bodyType: typeof page.body,
      body: page.body,
      bodyIsNull: page.body === null,
      bodyIsUndefined: page.body === undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 }
    );
  }
}
