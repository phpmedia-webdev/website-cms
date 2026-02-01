import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  createSingleUseBatch,
  createMultiUseCode,
} from "@/lib/mags/code-generator";
import { createServerSupabaseClient } from "@/lib/supabase/client";

const SCHEMA = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

/** GET - List all batches (admin) */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from("membership_code_batches")
      .select(`
        id,
        mag_id,
        name,
        use_type,
        code_hash,
        code_plain,
        max_uses,
        use_count,
        num_codes,
        expires_at,
        created_at,
        mags(id, name, uid)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const withCounts = await Promise.all(
      (data ?? []).map(async (row: Record<string, unknown>) => {
        if (row.use_type === "single_use") {
          const { count: total } = await supabase
            .schema(SCHEMA)
            .from("membership_codes")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", row.id);
          const { count: redeemed } = await supabase
            .schema(SCHEMA)
            .from("membership_codes")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", row.id)
            .eq("status", "redeemed");
          return {
            ...row,
            total_codes: total ?? 0,
            redeemed_count: redeemed ?? 0,
          };
        }
        return row;
      })
    );

    return NextResponse.json(withCounts);
  } catch (e) {
    console.error("Error listing batches:", e);
    return NextResponse.json(
      { error: "Failed to list batches" },
      { status: 500 }
    );
  }
}

/** POST - Create batch (admin) */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const useType = body.use_type as "single_use" | "multi_use";

    if (useType === "multi_use") {
      const { mag_id, code, name, max_uses, expires_at } = body;
      if (!mag_id || !code) {
        return NextResponse.json(
          { error: "mag_id and code required for multi-use" },
          { status: 400 }
        );
      }
      const exp = expires_at ? new Date(expires_at) : null;
      const { batchId, error: err } = await createMultiUseCode(
        mag_id,
        code.trim(),
        { name: name || null, maxUses: max_uses ?? null, expiresAt: exp }
      );
      if (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      return NextResponse.json({ id: batchId });
    }

    if (useType === "single_use") {
      const { mag_id, name, num_codes, expires_at, code_prefix, code_suffix, random_length, exclude_chars } = body;
      if (!mag_id || !name || !num_codes) {
        return NextResponse.json(
          { error: "mag_id, name, and num_codes required for single-use" },
          { status: 400 }
        );
      }
      const exp = expires_at ? new Date(expires_at) : null;
      const { batchId, error: err } = await createSingleUseBatch(mag_id, name, {
        numCodes: Math.min(Math.max(1, Number(num_codes) || 1), 1000),
        expiresAt: exp,
        codePrefix: code_prefix || undefined,
        codeSuffix: code_suffix || undefined,
        randomLength: random_length ?? 8,
        excludeChars: exclude_chars || undefined,
        createdBy: user.id,
      });
      if (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      return NextResponse.json({ id: batchId });
    }

    return NextResponse.json(
      { error: "use_type must be single_use or multi_use" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Error creating batch:", e);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
