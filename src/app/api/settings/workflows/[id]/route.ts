/**
 * PATCH /api/settings/workflows/[id] — Update a signup_code_actions row.
 * DELETE /api/settings/workflows/[id] — Delete a signup_code_actions row.
 * Admin only (workflows feature gated at page level).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isAdminRole, isSuperadminFromRole } from "@/lib/auth/resolve-role";
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

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireWorkflowsAdmin();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await _request.json().catch(() => ({}));
    const updates: {
      signup_code?: string | null;
      action_type?: string;
      sort_order?: number;
      config?: Record<string, unknown> | null;
      redirect_path?: string | null;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };

    if (body.signup_code !== undefined) {
      updates.signup_code =
        body.signup_code === null || body.signup_code === ""
          ? null
          : typeof body.signup_code === "string"
            ? body.signup_code.trim() || null
            : undefined;
    }
    if (body.action_type !== undefined) {
      const at = typeof body.action_type === "string" ? body.action_type.trim() : "";
      if (!at || !REGISTERED_ACTION_TYPES.includes(at)) {
        return NextResponse.json(
          { error: "Invalid action_type. Must be one of: " + REGISTERED_ACTION_TYPES.join(", ") },
          { status: 400 }
        );
      }
      updates.action_type = at;
    }
    if (typeof body.sort_order === "number" && body.sort_order >= 0) {
      updates.sort_order = Math.floor(body.sort_order);
    }
    if (body.config !== undefined) {
      updates.config =
        body.config === null || body.config === undefined
          ? null
          : typeof body.config === "object"
            ? body.config
            : undefined;
    }
    if (body.redirect_path !== undefined) {
      updates.redirect_path =
        typeof body.redirect_path === "string" ? body.redirect_path.trim() || null : null;
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { data, error } = await supabase
      .schema(schema)
      .from("signup_code_actions")
      .update(updates)
      .eq("id", id)
      .select("id, signup_code, action_type, sort_order, config, redirect_path")
      .single();

    if (error) {
      console.error("PATCH workflows:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to update" },
        { status: 500 }
      );
    }
    return NextResponse.json({ row: data });
  } catch (err) {
    console.error("PATCH workflows:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireWorkflowsAdmin();
    if ("error" in auth) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const schema = getClientSchema();

    const { error } = await supabase
      .schema(schema)
      .from("signup_code_actions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE workflows:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to delete" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE workflows:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
