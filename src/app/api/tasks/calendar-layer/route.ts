/**
 * GET /api/tasks/calendar-layer
 * Returns lightweight task due-date entries for calendar overlay.
 * Query: start (ISO), end (ISO)
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { listTasks } from "@/lib/supabase/projects";

type CalendarLayerTask = {
  id: string;
  task_number: string;
  title: string;
  due_date: string;
  project_id: string | null;
  task_status_slug: string;
};

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required" as const, status: 403 as const };
  }
  return null;
}

function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const directDate = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directDate?.[1]) return directDate[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authErr = await requireAdmin();
    if (authErr) {
      return NextResponse.json({ error: authErr.error }, { status: authErr.status });
    }

    const { searchParams } = new URL(request.url);
    const startDate = toIsoDate(searchParams.get("start"));
    const endDate = toIsoDate(searchParams.get("end"));
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start and end query params are required (ISO date/date-time)" },
        { status: 400 }
      );
    }

    const tasks = await listTasks(
      {
        due_before: endDate,
        exclude_status_slugs: ["completed"],
      },
      getClientSchema()
    );

    const taskIds = tasks.map((t) => t.id);
    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();
    const { data: visibleRows } = await supabase
      .schema(schema)
      .from("task_calendar_visibility")
      .select("task_id")
      .in("task_id", taskIds)
      .eq("show_on_calendar", true);
    const visibleTaskIds = new Set(
      ((visibleRows ?? []) as { task_id: string }[]).map((r) => r.task_id)
    );

    const data: CalendarLayerTask[] = tasks
      .filter((t) => {
        if (!visibleTaskIds.has(t.id)) return false;
        const due = t.due_date?.trim();
        return !!due;
      })
      .map((t) => ({
        id: t.id,
        task_number: t.task_number,
        title: t.title,
        due_date: t.due_date ?? "",
        project_id: t.project_id ?? null,
        task_status_slug: t.task_status_slug,
      }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/tasks/calendar-layer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

