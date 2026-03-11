import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import {
  createSingleUseBatch,
  createMultiUseCode,
  type BatchPurpose,
  type DiscountOptions,
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
        purpose,
        discount_type,
        discount_value,
        min_purchase,
        scope,
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
    const purpose = (body.purpose as BatchPurpose) ?? "membership";
    const isDiscount = purpose === "discount";

    const discountOptions: DiscountOptions | null =
      isDiscount && body.discount_type && body.discount_value != null
        ? {
            discountType: body.discount_type as "percent" | "fixed",
            discountValue: Number(body.discount_value),
            minPurchase: body.min_purchase != null ? Number(body.min_purchase) : null,
            scope: body.scope ?? null,
          }
        : null;

    if (useType === "multi_use") {
      const { mag_id, code, name, max_uses, expires_at } = body;
      if (!code) {
        return NextResponse.json(
          { error: "code required for multi-use" },
          { status: 400 }
        );
      }
      if (!isDiscount && !mag_id) {
        return NextResponse.json(
          { error: "mag_id required for membership multi-use" },
          { status: 400 }
        );
      }
      if (isDiscount && !discountOptions) {
        return NextResponse.json(
          { error: "discount_type and discount_value required for discount batches" },
          { status: 400 }
        );
      }
      const exp = expires_at ? new Date(expires_at) : null;
      const { batchId, error: err } = await createMultiUseCode(
        mag_id ?? null,
        code.trim(),
        {
          name: name || null,
          maxUses: max_uses ?? null,
          expiresAt: exp,
          purpose,
          discountOptions: isDiscount ? discountOptions : undefined,
        }
      );
      if (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      return NextResponse.json({ id: batchId });
    }

    if (useType === "single_use") {
      const { mag_id, name, num_codes, expires_at, code_prefix, code_suffix, random_length, exclude_chars } = body;
      if (!name || !num_codes) {
        return NextResponse.json(
          { error: "name and num_codes required for single-use" },
          { status: 400 }
        );
      }
      if (!isDiscount && !mag_id) {
        return NextResponse.json(
          { error: "mag_id required for membership single-use" },
          { status: 400 }
        );
      }
      if (isDiscount && !discountOptions) {
        return NextResponse.json(
          { error: "discount_type and discount_value required for discount batches" },
          { status: 400 }
        );
      }
      const exp = expires_at ? new Date(expires_at) : null;
      const { batchId, error: err } = await createSingleUseBatch(mag_id ?? null, name, {
        numCodes: Math.min(Math.max(1, Number(num_codes) || 1), 1000),
        expiresAt: exp,
        codePrefix: code_prefix || undefined,
        codeSuffix: code_suffix || undefined,
        randomLength: random_length ?? 8,
        excludeChars: (exclude_chars !== undefined && exclude_chars !== null) ? String(exclude_chars) : undefined,
        createdBy: user.id,
        purpose,
        discountOptions: isDiscount ? discountOptions : undefined,
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
