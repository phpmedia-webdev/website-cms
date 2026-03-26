import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const, user: null };
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: "Forbidden: Admin access required" as const, status: 403 as const, user: null };
  }
  return { error: null, status: 200 as const, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();
    const { data, error } = await supabase
      .schema(schema)
      .from("task_calendar_visibility")
      .select("show_on_calendar")
      .eq("task_id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ show_on_calendar: data?.show_on_calendar === true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error || !auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const showOnCalendar = Boolean(body.show_on_calendar);

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();
    const { data, error } = await supabase
      .schema(schema)
      .from("task_calendar_visibility")
      .upsert(
        {
          task_id: id,
          show_on_calendar: showOnCalendar,
          updated_by: auth.user.id,
        },
        { onConflict: "task_id" }
      )
      .select("show_on_calendar")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ show_on_calendar: data?.show_on_calendar === true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

