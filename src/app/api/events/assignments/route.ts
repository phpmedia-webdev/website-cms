import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import {
  getEventsParticipantAssignments,
  getEventsResourceAssignments,
  getResourcesAdmin,
} from "@/lib/supabase/participants-resources";
import { withRateLimit } from "@/lib/api/middleware";

async function requireAdmin() {
  const supabase = await createServerSupabaseClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const metadata = user.user_metadata as { type?: string } | undefined;
  const isAdmin = metadata?.type === "admin" || metadata?.type === "superadmin";
  if (!isAdmin) return { error: "Forbidden" as const, status: 403 as const };
  return null;
}

/**
 * GET /api/events/assignments?ids=uuid1,uuid2,...
 * Return participant and resource assignments for the given event IDs (for calendar filter + hover tooltips).
 * **`resourceNamesByEvent`** — same keys as `resourceAssignments`, values are sorted display names for UI.
 */
async function getHandler(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const eventIds = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (eventIds.length === 0) {
      return NextResponse.json({
        data: {
          participantAssignments: {},
          resourceAssignments: {},
          resourceNamesByEvent: {},
        },
      });
    }
    const [participantMap, resourceMap] = await Promise.all([
      getEventsParticipantAssignments(eventIds),
      getEventsResourceAssignments(eventIds),
    ]);
    const participantAssignments: Record<string, string[]> = {};
    const resourceAssignments: Record<string, string[]> = {};
    const allResourceIds = new Set<string>();
    for (const eid of eventIds) {
      participantAssignments[eid] = Array.from(participantMap.get(eid) ?? []);
      const rids = Array.from(resourceMap.get(eid) ?? []);
      resourceAssignments[eid] = rids;
      rids.forEach((id) => allResourceIds.add(id));
    }

    const nameById = new Map<string, string>();
    if (allResourceIds.size > 0) {
      const registry = await getResourcesAdmin();
      for (const row of registry) {
        if (allResourceIds.has(row.id)) {
          nameById.set(row.id, row.name?.trim() ? row.name.trim() : "Resource");
        }
      }
    }
    const resourceNamesByEvent: Record<string, string[]> = {};
    for (const eid of eventIds) {
      const labels = (resourceAssignments[eid] ?? [])
        .map((id) => nameById.get(id) ?? "Unknown resource")
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      resourceNamesByEvent[eid] = labels;
    }

    return NextResponse.json({
      data: { participantAssignments, resourceAssignments, resourceNamesByEvent },
    });
  } catch (error) {
    console.error("GET /api/events/assignments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler);
