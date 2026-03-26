import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

type ReminderMethod = "email" | "sms" | "notification";
type ReminderUnit = "minutes" | "hours" | "days";

function isReminderMethod(value: unknown): value is ReminderMethod {
  return value === "email" || value === "sms" || value === "notification";
}

function parseMethods(value: unknown): ReminderMethod[] {
  const raw = Array.isArray(value) ? value : [value];
  const normalized = [...new Set(raw.map((v) => String(v ?? "").trim().toLowerCase()))].filter(
    (v): v is ReminderMethod => isReminderMethod(v)
  );
  return normalized;
}

function parseUnit(value: unknown): ReminderUnit | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "minutes" || v === "hours" || v === "days") return v;
  return null;
}

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
      .from("task_reminders")
      .select("id, task_id, offset_value, offset_unit, methods, is_active, created_at, updated_at")
      .eq("task_id", id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? null });
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
    const offsetValueRaw = Number(body.offset_value);
    const offset_value = Number.isFinite(offsetValueRaw) ? Math.trunc(offsetValueRaw) : NaN;
    const offset_unit = parseUnit(body.offset_unit);
    const methods = parseMethods(body.methods ?? body.method);
    const is_active = body.is_active === undefined ? true : Boolean(body.is_active);

    if (!Number.isFinite(offset_value) || offset_value < 1 || offset_value > 365) {
      return NextResponse.json({ error: "offset_value must be between 1 and 365" }, { status: 400 });
    }
    if (!offset_unit) {
      return NextResponse.json({ error: "offset_unit must be minutes, hours, or days" }, { status: 400 });
    }
    if (methods.length === 0) {
      return NextResponse.json({ error: "Select at least one method: email, sms, or notification" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();
    const payload = {
      task_id: id,
      offset_value,
      offset_unit,
      methods,
      is_active,
      created_by: auth.user.id,
    };
    const { data, error } = await supabase
      .schema(schema)
      .from("task_reminders")
      .upsert(payload, { onConflict: "task_id" })
      .select("id, task_id, offset_value, offset_unit, methods, is_active, created_at, updated_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

