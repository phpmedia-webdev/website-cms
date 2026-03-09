import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole, hasPermission, PERMISSION_APPROVE_REJECT } from "@/lib/auth/resolve-role";
import { createBlogComment, getCommentsByContentId } from "@/lib/supabase/crm";
import { getTenantUserByAuthUserId } from "@/lib/supabase/tenant-users";
import { getMemberByUserId } from "@/lib/supabase/members";
import { getCommentAuthorDisplayName } from "@/lib/blog-comments/author-name";

/**
 * POST /api/blog/comments
 * Submit a blog comment. Body: { content_id: string, body: string }.
 * Requires: authenticated user with verified email, AND (member of this tenant OR admin/superadmin).
 * Creates note with note_type = 'blog_comment', status = 'pending'.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const contentId = typeof body.content_id === "string" ? body.content_id.trim() : "";
    const commentBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!contentId || !commentBody) {
      return NextResponse.json(
        { error: "content_id and body are required" },
        { status: 400 }
      );
    }
    const [member, role] = await Promise.all([
      getMemberByUserId(user.id),
      getRoleForCurrentUser(),
    ]);
    const isStaff = role !== null && (isSuperadminFromRole(role) || isAdminRole(role));
    if (!member && !isStaff) {
      return NextResponse.json(
        { error: "Only members of this site can comment. Sign up or log in as a member." },
        { status: 403 }
      );
    }
    const { note, error } = await createBlogComment(contentId, commentBody, user.id);
    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to create comment" },
        { status: 500 }
      );
    }
    return NextResponse.json({ id: note?.id });
  } catch (err) {
    console.error("POST /api/blog/comments:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create comment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blog/comments?content_id=xxx&status=approved|pending|rejected|all
 * List comments for a post. status=approved (default) for public; status=all returns all (requires approve_reject permission).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("content_id");
    const statusParam = searchParams.get("status");
    if (!contentId) {
      return NextResponse.json(
        { error: "content_id is required" },
        { status: 400 }
      );
    }
    const wantAll = statusParam === "all";
    if (wantAll) {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const canModerate = await hasPermission(PERMISSION_APPROVE_REJECT);
      if (!canModerate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const statusFilter: "pending" | "approved" | "rejected" | undefined =
      wantAll ? undefined : (statusParam as "pending" | "approved" | "rejected") || "approved";
    const comments = await getCommentsByContentId(contentId, statusFilter);
    if (wantAll && comments.length > 0) {
      const authorIds = [...new Set(comments.map((c) => c.author_id).filter(Boolean))] as string[];
      const authorNames: Record<string, string> = {};
      await Promise.all(
        authorIds.map(async (authId) => {
          authorNames[authId] = await getCommentAuthorDisplayName(authId);
        })
      );
      const withNames = comments.map((c) => ({
        ...c,
        authorDisplayName: c.author_id ? authorNames[c.author_id] ?? "Commenter" : "Commenter",
      }));
      return NextResponse.json(withNames);
    }
    return NextResponse.json(comments);
  } catch (err) {
    console.error("GET /api/blog/comments:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
