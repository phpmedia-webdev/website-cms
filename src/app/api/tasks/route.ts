/**
 * GET /api/tasks — Admin all-tasks bundle.
 * Query (comma-separated): project_ids (UUIDs), status_slugs, type_slugs, phase_slugs,
 * assignee_user_ids, assignee_contact_ids, exclude_status_slugs, due_before (YYYY-MM-DD).
 * Slugs match Settings → Customizer (task_status, task_type, task_phase).
 * Tasks whose project has `archived_at` set are omitted (**197**).
 * Preset filters: **198** — `exclude_status_slugs` (e.g. **All Active** / **My tasks** hide completed), `due_before` for **Overdue** (due_date &lt; param, not null).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

/** Per-request task list; query string varies by preset — do not cache at the framework layer. */
export const dynamic = "force-dynamic";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import type { ListTasksFilters } from "@/lib/supabase/projects";
import { getAdminTasksListBundle } from "@/lib/tasks/admin-task-list";
import { getClientSchema } from "@/lib/supabase/schema";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required" as const, status: 403 as const };
  }
  return null;
}

function splitCsv(param: string | null): string[] {
  if (!param?.trim()) return [];
  return param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { searchParams } = new URL(request.url);
    const schema = getClientSchema();

    const projectIds = splitCsv(searchParams.get("project_ids"));
    const statusSlugs = splitCsv(searchParams.get("status_slugs")).map((s) => s.trim().toLowerCase());
    const typeSlugs = splitCsv(searchParams.get("type_slugs")).map((s) => s.trim().toLowerCase());
    const phaseSlugs = splitCsv(searchParams.get("phase_slugs")).map((s) => s.trim().toLowerCase());
    const assigneeUserIds = splitCsv(searchParams.get("assignee_user_ids"));
    const assigneeContactIds = splitCsv(searchParams.get("assignee_contact_ids"));
    const excludeStatusSlugs = splitCsv(searchParams.get("exclude_status_slugs")).map((s) =>
      s.trim().toLowerCase()
    );
    const dueBeforeRaw = searchParams.get("due_before")?.trim();
    const dueBefore =
      dueBeforeRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueBeforeRaw) ? dueBeforeRaw : null;

    const filters: ListTasksFilters = {
      project_ids: projectIds.length > 0 ? projectIds : null,
      status_slugs: statusSlugs.length > 0 ? statusSlugs : null,
      type_slugs: typeSlugs.length > 0 ? typeSlugs : null,
      phase_slugs: phaseSlugs.length > 0 ? phaseSlugs : null,
      assignee_user_ids: assigneeUserIds.length > 0 ? assigneeUserIds : null,
      assignee_contact_ids: assigneeContactIds.length > 0 ? assigneeContactIds : null,
      exclude_status_slugs: excludeStatusSlugs.length > 0 ? excludeStatusSlugs : null,
      due_before: dueBefore,
    };

    const bundle = await getAdminTasksListBundle(filters, schema);
    return NextResponse.json(bundle);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
