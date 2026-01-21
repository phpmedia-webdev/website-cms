import { NextResponse } from "next/server";
import { getCurrentUser, isSuperadmin } from "@/lib/auth/supabase-auth";
import { getIntegrations, updateIntegration } from "@/lib/supabase/integrations";

/**
 * GET /api/admin/integrations
 * Get all integration settings (superadmin only)
 */
export async function GET() {
  try {
    // Check if user is superadmin
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    // TODO: Add 2FA check (aal2) when 2FA is implemented
    // const aal = await getAAL(user);
    // if (aal !== "aal2") {
    //   return NextResponse.json(
    //     { error: "2FA required for this operation" },
    //     { status: 403 }
    //   );
    // }

    const integrations = await getIntegrations();

    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/integrations
 * Update integration configuration (superadmin only)
 */
export async function PUT(request: Request) {
  try {
    // Check if user is superadmin
    const user = await getCurrentUser();
    if (!user || !isSuperadmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    // TODO: Add 2FA check (aal2) when 2FA is implemented
    // const aal = await getAAL(user);
    // if (aal !== "aal2") {
    //   return NextResponse.json(
    //     { error: "2FA required for this operation" },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const { name, enabled, config } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Integration name is required" },
        { status: 400 }
      );
    }

    // Validate integration name
    const validIntegrations = ["google_analytics", "visitor_tracking", "simple_commenter"];
    if (!validIntegrations.includes(name)) {
      return NextResponse.json(
        { error: "Invalid integration name" },
        { status: 400 }
      );
    }

    // Validate config based on integration type
    if (name === "google_analytics" && config.measurement_id) {
      // Basic validation for Google Analytics Measurement ID format
      if (!/^G-[A-Z0-9]+$/.test(config.measurement_id)) {
        return NextResponse.json(
          { error: "Invalid Google Analytics Measurement ID format" },
          { status: 400 }
        );
      }
    }

    const { integration, error } = await updateIntegration(name, config, enabled);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update integration" },
        { status: 500 }
      );
    }

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 }
    );
  }
}
