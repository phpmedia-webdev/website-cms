/**
 * GET /api/ecommerce/orders/[id] — order detail with items (admin).
 * PATCH /api/ecommerce/orders/[id] — update order status (admin).
 * Step 16.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getRoleForCurrentUser, isSuperadminFromRole, isAdminRole } from "@/lib/auth/resolve-role";
import { getClientSchema } from "@/lib/supabase/schema";
import {
  getOrderById,
  getOrderItems,
  updateOrderStatus,
  decrementStockForOrder,
  type OrderStatus,
} from "@/lib/shop/orders";
import { processMembershipProductsForOrder } from "@/lib/shop/payment-to-mag";
import { sendOrderConfirmationEmail, sendDigitalDeliveryEmail } from "@/lib/shop/order-email";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const schema = getClientSchema();
    const order = await getOrderById(id, schema);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const items = await getOrderItems(id, schema);
    return NextResponse.json({ order, items });
  } catch (error) {
    console.error("GET /api/ecommerce/orders/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const status = body?.status as OrderStatus | undefined;
    const valid: OrderStatus[] = ["pending", "paid", "processing", "completed"];
    if (!status || !valid.includes(status)) {
      return NextResponse.json(
        { error: "Invalid or missing status. Use one of: pending, paid, processing, completed" },
        { status: 400 }
      );
    }

    const schema = getClientSchema();
    const order = await getOrderById(id, schema);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const ok = await updateOrderStatus(id, status, schema);
    if (!ok) {
      return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
    }

    if (status === "paid") {
      try {
        await decrementStockForOrder(id, schema);
        const { processed, errors } = await processMembershipProductsForOrder(id, schema);
        if (errors.length > 0) {
          console.warn("Payment-to-MAG for order", id, "errors:", errors);
        }
        if (processed > 0) {
          console.log("Payment-to-MAG for order", id, "processed", processed, "membership product(s).");
        }
        const items = await getOrderItems(id, schema);
        sendOrderConfirmationEmail(order, items).catch((e) =>
          console.warn("Order confirmation email failed for order", id, e)
        );
      } catch (e) {
        console.error("Payment-to-MAG for order", id, e);
      }
    }

    if (status === "completed") {
      const items = await getOrderItems(id, schema);
      const hasShippable = items.some((i) => i.shippable);
      if (!hasShippable) {
        sendDigitalDeliveryEmail(order, items).catch((e) =>
          console.warn("Digital delivery email failed for order", id, e)
        );
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("PATCH /api/ecommerce/orders/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
