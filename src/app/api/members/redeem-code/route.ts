import { NextResponse } from "next/server";
import { createServerSupabaseClientSSR } from "@/lib/supabase/client";
import { getMemberByUserId } from "@/lib/supabase/members";
import { redeemCode } from "@/lib/mags/code-generator";
import { cookies } from "next/headers";

/**
 * POST /api/members/redeem-code
 * Redeem a membership code. Requires authenticated member (user_metadata.type = "member").
 * Body: { code: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClientSSR(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((user.user_metadata?.type as string) !== "member") {
      return NextResponse.json(
        { error: "Only members can redeem codes" },
        { status: 403 }
      );
    }

    const member = await getMemberByUserId(user.id);
    if (!member) {
      return NextResponse.json(
        { error: "Member profile not found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const code = body.code;
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const result = await redeemCode(code.trim(), member.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Invalid code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, mag_id: result.magId });
  } catch (e) {
    console.error("Redeem code error:", e);
    return NextResponse.json(
      { error: "Failed to redeem code" },
      { status: 500 }
    );
  }
}
