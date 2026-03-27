/**
 * POST /api/admin/message-center/broadcast
 * MAG posts → each MAG’s `mag_group` thread; team → admin-only timeline rows per staff user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isTenantAdminRole } from "@/lib/auth/resolve-role";
import { executeAdminBroadcast } from "@/lib/message-center/admin-broadcast";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isTenantAdminRole(role))) {
      return NextResponse.json(
        { error: "Only superadmin or tenant admin may send broadcasts." },
        { status: 403 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as {
      body?: unknown;
      allUsers?: unknown;
      magIds?: unknown;
      teamUserIds?: unknown;
    };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const allMags = body.allUsers === true;
    const magIds = Array.isArray(body.magIds)
      ? body.magIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
    const teamUserIds = Array.isArray(body.teamUserIds)
      ? body.teamUserIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (!text) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }
    if (!allMags && magIds.length === 0 && teamUserIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one audience (all GPUM / MAGs / team)." },
        { status: 400 }
      );
    }

    const result = await executeAdminBroadcast({
      body: text,
      authorUserId: user.id,
      allMags,
      magIds,
      teamUserIds,
    });

    const delivered =
      result.magThreadsPosted + result.teamInboxRows + (result.memberPortalRows ?? 0);
    if (delivered === 0 && result.errors.length > 0) {
      return NextResponse.json(
        {
          error: result.errors[0] ?? "Broadcast failed",
          errors: result.errors,
          magThreadsPosted: 0,
          teamInboxRows: 0,
          memberPortalRows: 0,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      magThreadsPosted: result.magThreadsPosted,
      teamInboxRows: result.teamInboxRows,
      memberPortalRows: result.memberPortalRows,
      errors: result.errors.length ? result.errors : undefined,
    });
  } catch (e) {
    console.error("POST /api/admin/message-center/broadcast:", e);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
