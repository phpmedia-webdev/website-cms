import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export interface UnifiedCodeRow {
  code: string;
  batch_id: string;
  batch_name: string;
  use_type: "single_use" | "multi_use";
  status: "open" | "used";
  redeemed_at: string | null;
  contact_id: string | null;
  contact_display: string;
}

/**
 * GET /api/admin/membership-codes/codes
 * Query: batchId (optional), status (all|open|used), limit (default 200), offset (default 0)
 * Returns unified list of single-use codes + multi-use redemption rows for list/export.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId")?.trim() || null;
    const statusFilter = (searchParams.get("status") || "all") as "all" | "open" | "used";
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "200", 10) || 200));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

    const supabase = createServerSupabaseClient();

    const batchesRes = await supabase
      .schema(SCHEMA)
      .from("membership_code_batches")
      .select("id, name, use_type, code_plain")
      .order("created_at", { ascending: false });

    if (batchesRes.error) {
      return NextResponse.json({ error: batchesRes.error.message }, { status: 500 });
    }

    const allBatches = (batchesRes.data ?? []) as { id: string; name: string; use_type: string; code_plain?: string | null }[];
    const batchIds = batchId ? (allBatches.some((x) => x.id === batchId) ? [batchId] : []) : allBatches.map((x) => x.id);
    const batchById = new Map(allBatches.map((b) => [b.id, b]));

    const rows: UnifiedCodeRow[] = [];

    if (batchIds.length > 0) {
      const { data: singleCodes } = await supabase
        .schema(SCHEMA)
        .from("membership_codes")
        .select("id, batch_id, code_plain, status, redeemed_at, redeemed_by_member_id")
        .in("batch_id", batchIds)
        .order("redeemed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true });

      const memberIds = [...new Set((singleCodes ?? []).map((r: Record<string, unknown>) => r.redeemed_by_member_id).filter(Boolean) as string[])];
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

      const cidsFromSingle = [...new Set(memberIds.map((id) => midToCid.get(id)).filter(Boolean))] as string[];

      const { data: multiRedemptions } = await supabase
        .schema(SCHEMA)
        .from("membership_code_redemptions")
        .select("batch_id, contact_id, redeemed_at")
        .in("batch_id", batchIds)
        .order("redeemed_at", { ascending: false });

      const cidsFromMulti = [...new Set((multiRedemptions ?? []).map((r: Record<string, unknown>) => r.contact_id).filter(Boolean) as string[])];
      const allCids = [...new Set([...cidsFromSingle, ...cidsFromMulti])];
      const cidToDisplay = new Map<string, string>();
      if (allCids.length > 0) {
        const { data: contacts } = await supabase
          .schema(SCHEMA)
          .from("crm_contacts")
          .select("id, email, full_name")
          .in("id", allCids);
        (contacts ?? []).forEach((c: Record<string, unknown>) => {
          cidToDisplay.set(c.id as string, ((c.email as string) || (c.full_name as string) || "—") as string);
        });
      }

      for (const r of (singleCodes ?? []) as Record<string, unknown>[]) {
        const batch = batchById.get(r.batch_id as string);
        const st = r.status === "redeemed" ? "used" : "open";
        if (statusFilter !== "all" && statusFilter !== st) continue;
        const cid = r.redeemed_by_member_id ? midToCid.get(r.redeemed_by_member_id as string) : null;
        rows.push({
          code: (r.code_plain as string) ?? "—",
          batch_id: r.batch_id as string,
          batch_name: batch?.name ?? (r.batch_id as string),
          use_type: "single_use",
          status: st as "open" | "used",
          redeemed_at: (r.redeemed_at as string | null) ?? null,
          contact_id: cid ?? null,
          contact_display: cid ? (cidToDisplay.get(cid) ?? "—") : "—",
        });
      }

      for (const r of (multiRedemptions ?? []) as Record<string, unknown>[]) {
        if (statusFilter === "open") continue;
        const batch = batchById.get(r.batch_id as string);
        rows.push({
          code: batch?.code_plain ?? "—",
          batch_id: r.batch_id as string,
          batch_name: batch?.name ?? (r.batch_id as string),
          use_type: "multi_use",
          status: "used",
          redeemed_at: (r.redeemed_at as string | null) ?? null,
          contact_id: (r.contact_id as string | null) ?? null,
          contact_display: r.contact_id ? (cidToDisplay.get(r.contact_id as string) ?? "—") : "—",
        });
      }
    }

    rows.sort((a, b) => {
      const aTime = a.redeemed_at ? new Date(a.redeemed_at).getTime() : 0;
      const bTime = b.redeemed_at ? new Date(b.redeemed_at).getTime() : 0;
      return bTime - aTime;
    });

    const total = rows.length;
    const paginated = rows.slice(offset, offset + limit);

    return NextResponse.json({
      codes: paginated,
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error("Error listing codes:", e);
    return NextResponse.json(
      { error: "Failed to list codes" },
      { status: 500 }
    );
  }
}
