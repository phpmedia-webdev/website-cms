/**
 * GET /api/settings/workflows — List all signup_code_actions for admin UI.
 * POST /api/settings/workflows — Create a new signup_code_actions row.
 * Admin only (workflows feature gated at page level).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import { getAllSignupCodeActions } from "@/lib/signup-pipeline/get-actions";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { REGISTERED_ACTION_TYPES } from "@/lib/signup-pipeline";

async function requireWorkflowsAdmin(): Promise<
  { ok: true } | { error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = await getRoleForCurrentUser();
  if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET() {
  try {
    const auth = await requireWorkflowsAdmin();
    if ("error" in auth) return auth.error;

    const rows = await getAllSignupCodeActions();
    return NextResponse.json({ rows });
  } catch (err) {
    console.error("GET workflows:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireWorkflowsAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const signupCode =
      body.signup_code === undefined || body.signup_code === null
        ? null
        : typeof body.signup_code === "string"
          ? body.signup_code.trim() || null
          : null;
    const actionType = typeof body.action_type === "string" ? body.action_type.trim() : "";
    const sortOrder =
      typeof body.sort_order === "number" && body.sort_order >= 0
        ? Math.floor(body.sort_order)
        : 0;
    const config =
      body.config !== undefined && body.config !== null && typeof body.config === "object"
        ? body.config
        : null;
    const redirectPath =
      typeof body.redirect_path === "string" ? body.redirect_path.trim() || null : null;

    if (!actionType || !REGISTERED_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json(
        { error: "Invalid or missing action_type. Must be one of: " + REGISTERED_ACTION_TYPES.join(", ") },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .schema(schema)
      .from("signup_code_actions")
      .insert({
        signup_code: signupCode,
        action_type: actionType,
        sort_order: sortOrder,
        config: config,
        redirect_path: redirectPath,
        updated_at: now,
      })
      .select("id, signup_code, action_type, sort_order, config, redirect_path")
      .single();

    if (error) {
      console.error("POST workflows insert:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to create workflow action" },
        { status: 500 }
      );
    }
    return NextResponse.json({ row: data });
  } catch (err) {
    console.error("POST workflows:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
