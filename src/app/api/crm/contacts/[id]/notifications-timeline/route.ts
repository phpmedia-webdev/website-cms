import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  insertContactNotificationsTimeline,
  isValidVisibility,
  listContactNotificationsTimeline,
} from "@/lib/supabase/contact-notifications-timeline";

/**
 * GET /api/crm/contacts/[id]/notifications-timeline?limit=50&kinds=a,b
 * Phase 18C: list `contact_notifications_timeline` rows for CRM contact detail (admin/authenticated).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: contactId } = await params;
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const kindsParam = searchParams.get("kinds");
    const kinds = kindsParam
      ? kindsParam
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : undefined;
    const data = await listContactNotificationsTimeline(contactId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      kinds,
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET notifications-timeline:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}

/**
 * POST /api/crm/contacts/[id]/notifications-timeline
 * Body: { kind, visibility, title, body?, metadata?, subject_type?, subject_id?, source_event? }
 * Proof write: e.g. kind "staff_note", visibility "admin_only".
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
    const { id: contactId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const kind = typeof body.kind === "string" ? body.kind : "";
    const visibility = typeof body.visibility === "string" ? body.visibility : "";
    const title = typeof body.title === "string" ? body.title : "";
    if (!isValidVisibility(visibility)) {
      return NextResponse.json(
        { error: "visibility must be admin_only, client_visible, or both" },
        { status: 400 }
      );
    }
    const metadata =
      body.metadata && typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as Record<string, unknown>)
        : undefined;
    const { row, error } = await insertContactNotificationsTimeline({
      contact_id: contactId,
      kind,
      visibility,
      title,
      body: typeof body.body === "string" ? body.body : null,
      metadata,
      author_user_id: user.id,
      recipient_user_id:
        typeof body.recipient_user_id === "string" ? body.recipient_user_id : undefined,
      subject_type: typeof body.subject_type === "string" ? body.subject_type : undefined,
      subject_id: typeof body.subject_id === "string" ? body.subject_id : undefined,
      source_event: typeof body.source_event === "string" ? body.source_event : undefined,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error("POST notifications-timeline:", error);
    return NextResponse.json({ error: "Failed to create timeline row" }, { status: 500 });
  }
}
