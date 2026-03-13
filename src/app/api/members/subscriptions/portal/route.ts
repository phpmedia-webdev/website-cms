/**
 * POST /api/members/subscriptions/portal
 * Step 35: Create Stripe Customer Portal session for current member; returns { url } to redirect for manage/cancel.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMemberByUserId } from "@/lib/supabase/members";
import { getContactById } from "@/lib/supabase/crm";
import { getStripeClient } from "@/lib/stripe/config";
import { getSiteMetadata } from "@/lib/supabase/settings";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    let stripeCustomerId: string | null = null;
    const member = await getMemberByUserId(user.id);
    if (member) {
      const contact = await getContactById(member.contact_id);
      stripeCustomerId = contact?.external_stripe_id ?? null;
    }
    if (!stripeCustomerId) {
      const schema = getClientSchema();
      const supabase = createServerSupabaseClient();
      const { data: sub } = await supabase
        .schema(schema ?? "")
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      stripeCustomerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
    }
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer linked. Complete a purchase or subscription to manage billing." },
        { status: 400 }
      );
    }

    const meta = await getSiteMetadata();
    const baseUrl = meta.url?.replace(/\/$/, "") || request.nextUrl.origin;
    const returnUrl = `${baseUrl}/members/subscriptions`;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/members/subscriptions/portal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
