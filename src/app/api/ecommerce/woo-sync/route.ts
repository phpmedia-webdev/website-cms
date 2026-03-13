/**
 * POST /api/ecommerce/woo-sync
 * Step 47: Import WooCommerce customers and orders via REST API.
 * Body: { site_url: string, consumer_key: string, consumer_secret: string, sync?: "all" | "customers" | "orders" }
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import {
  syncWooCommerceToApp,
  syncWooCommerceCustomersToCrm,
  syncWooCommerceOrdersToApp,
  type WooCommerceConfig,
} from "@/lib/shop/woo-commerce-sync";

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const siteUrl = typeof body.site_url === "string" ? body.site_url.trim() : "";
    const consumerKey = typeof body.consumer_key === "string" ? body.consumer_key.trim() : "";
    const consumerSecret =
      typeof body.consumer_secret === "string" ? body.consumer_secret.trim() : "";
    const sync = body.sync === "customers" || body.sync === "orders" ? body.sync : "all";

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "site_url, consumer_key, and consumer_secret are required" },
        { status: 400 }
      );
    }

    const config: WooCommerceConfig = { siteUrl, consumerKey, consumerSecret };
    const schema = getClientSchema();

    if (sync === "customers") {
      const customers = await syncWooCommerceCustomersToCrm(config, schema ?? undefined);
      return NextResponse.json({
        success: true,
        customers: {
          created: customers.created,
          updated: customers.updated,
          errors: customers.errors,
        },
        orders: null,
      });
    }
    if (sync === "orders") {
      const orders = await syncWooCommerceOrdersToApp(config, schema ?? undefined);
      return NextResponse.json({
        success: true,
        customers: null,
        orders: {
          created: orders.created,
          skipped: orders.skipped,
          errors: orders.errors,
        },
      });
    }

    const result = await syncWooCommerceToApp(config, schema ?? undefined);
    return NextResponse.json({
      success: true,
      customers: {
        created: result.customers.created,
        updated: result.customers.updated,
        errors: result.customers.errors,
      },
      orders: {
        created: result.orders.created,
        skipped: result.orders.skipped,
        errors: result.orders.errors,
      },
    });
  } catch (error) {
    console.error("POST /api/ecommerce/woo-sync:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
