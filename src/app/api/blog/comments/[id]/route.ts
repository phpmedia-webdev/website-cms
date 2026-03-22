import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { hasPermission, PERMISSION_APPROVE_REJECT } from "@/lib/auth/resolve-role";
import { updateBlogCommentModerationStatus } from "@/lib/supabase/blog-comment-messages";

/**
 * PATCH /api/blog/comments/[id]
 * Update comment moderation. Body: { status: 'approved' | 'rejected' }.
 * `id` is **`thread_messages.id`** (not `crm_notes`).
 * Requires "approve_reject" permission (PHP-Auth role assignment); when PHP-Auth not configured, admin/superadmin allowed.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canModerate = await hasPermission(PERMISSION_APPROVE_REJECT);
    if (!canModerate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const status = body.status as "approved" | "rejected" | undefined;
    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }
    const { success, error } = await updateBlogCommentModerationStatus(id, status);
    if (!success) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to update comment status" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/blog/comments/[id]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
