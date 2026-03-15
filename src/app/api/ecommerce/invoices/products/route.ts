/**
 * GET /api/ecommerce/invoices/products — list products for invoice line picker (admin).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import { getProductList } from "@/lib/supabase/products";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = await getRoleForCurrentUser();
    if (!role || (!isSuperadminFromRole(role) && !isAdminRole(role))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const schema = getClientSchema();
    const list = await getProductList(schema);
    const products = list.map((p) => ({
      content_id: p.id,
      title: p.title,
      price: p.price,
      currency: p.currency ?? "USD",
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET /api/ecommerce/invoices/products:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
