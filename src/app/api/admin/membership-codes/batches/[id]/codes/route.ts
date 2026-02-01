import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/**
 * GET - List codes for a batch.
 * Single-use: returns each code with status and contact/email.
 * Multi-use: returns redemption log with code, status, contact/email.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: batchId } = await params;
    const supabase = createServerSupabaseClient();

    const batch = await supabase
      .schema(SCHEMA)
      .from("membership_code_batches")
      .select("id, use_type, code_plain")
      .eq("id", batchId)
      .single();

    if (batch.error || !batch.data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const b = batch.data as { use_type: string; code_plain?: string | null };

    if (b.use_type === "single_use") {
      const { data: codes } = await supabase
        .schema(SCHEMA)
        .from("membership_codes")
        .select("id, code_plain, status, redeemed_at, redeemed_by_member_id")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true });

      const memberIds = [...new Set((codes ?? []).map((r: Record<string, unknown>) => r.redeemed_by_member_id).filter(Boolean) as string[])];
      const midToCid = new Map<string, string>();
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .schema(SCHEMA)
          .from("members")
          .select("id, contact_id")
          .in("id", memberIds);
        (members ?? []).forEach((m: Record<string, unknown>) => {
          midToCid.set(m.id as string, m.contact_id as string);
        });
      }
      const cids = [...new Set(midToCid.values())].filter(Boolean);
      const cidToDisplay = new Map<string, string>();
      if (cids.length > 0) {
        const { data: contacts } = await supabase
          .schema(SCHEMA)
          .from("crm_contacts")
          .select("id, email, full_name")
          .in("id", cids);
        (contacts ?? []).forEach((c: Record<string, unknown>) => {
          cidToDisplay.set(c.id as string, ((c.email as string) || (c.full_name as string) || "—") as string);
        });
      }

      const rows = (codes ?? []).map((r: Record<string, unknown>) => {
        const cid = r.redeemed_by_member_id ? midToCid.get(r.redeemed_by_member_id as string) : null;
        return {
          code: r.code_plain ?? "—",
          status: r.status === "redeemed" ? "Redeemed" : "Open",
          redeemed_at: r.redeemed_at ?? null,
          contact_email: r.status === "redeemed" && cid ? (cidToDisplay.get(cid) ?? "—") : "—",
          contact_id: r.status === "redeemed" && cid ? cid : null,
        };
      });
      return NextResponse.json({ use_type: "single_use", codes: rows });
    }

    if (b.use_type === "multi_use") {
      const { data: redemptions } = await supabase
        .schema(SCHEMA)
        .from("membership_code_redemptions")
        .select("id, redeemed_at, contact_id")
        .eq("batch_id", batchId)
        .order("redeemed_at", { ascending: false });

      const cids = [...new Set((redemptions ?? []).map((r: Record<string, unknown>) => r.contact_id).filter(Boolean) as string[])];
      const cidToDisplay = new Map<string, string>();
      if (cids.length > 0) {
        const { data: contacts } = await supabase
          .schema(SCHEMA)
          .from("crm_contacts")
          .select("id, email, full_name")
          .in("id", cids);
        (contacts ?? []).forEach((c: Record<string, unknown>) => {
          cidToDisplay.set(c.id as string, ((c.email as string) || (c.full_name as string) || "—") as string);
        });
      }

      const rows = (redemptions ?? []).map((r: Record<string, unknown>) => ({
        code: b.code_plain ?? "—",
        status: "Redeemed",
        redeemed_at: r.redeemed_at ?? null,
        contact_email: r.contact_id ? (cidToDisplay.get(r.contact_id as string) ?? "—") : "—",
        contact_id: r.contact_id ?? null,
      }));
      return NextResponse.json({
        use_type: "multi_use",
        code: b.code_plain ?? "—",
        codes: rows,
      });
    }

    return NextResponse.json({ error: "Invalid batch type" }, { status: 400 });
  } catch (e) {
    console.error("Error listing codes:", e);
    return NextResponse.json(
      { error: "Failed to list codes" },
      { status: 500 }
    );
  }
}
