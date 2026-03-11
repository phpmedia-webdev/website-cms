import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/**
 * POST /api/admin/membership-codes/codes/[id]/mark-used
 * Manually mark a single-use code as used (admin). Sets status=redeemed, redeemed_at=now.
 * redeemed_by_member_id is left null (manual mark).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: codeId } = await params;
    if (!codeId) {
      return NextResponse.json({ error: "Code ID required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    const { data: row, error: fetchErr } = await supabase
      .schema(SCHEMA)
      .from("membership_codes")
      .select("id, status")
      .eq("id", codeId)
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    if ((row as { status: string }).status === "redeemed") {
      return NextResponse.json({ error: "Code is already used" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .schema(SCHEMA)
      .from("membership_codes")
      .update({
        status: "redeemed",
        redeemed_at: now,
        redeemed_by_member_id: null,
      })
      .eq("id", codeId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, redeemed_at: now });
  } catch (e) {
    console.error("Mark code used error:", e);
    return NextResponse.json(
      { error: "Failed to mark code as used" },
      { status: 500 }
    );
  }
}
