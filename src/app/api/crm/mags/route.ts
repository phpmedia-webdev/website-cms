import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMags, createMag } from "@/lib/supabase/crm";

/**
 * GET /api/crm/mags
 * List all MAGs (admin; includes draft).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const mags = await getMags(true);
    return NextResponse.json(mags);
  } catch (error) {
    console.error("Error fetching MAGs:", error);
    return NextResponse.json(
      { error: "Failed to fetch MAGs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/mags
 * Create a MAG (admin). Body: { name, uid, description?, start_date?, end_date?, status? }.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mag: created, error } = await createMag({
      name: body.name,
      uid: body.uid,
      description: body.description ?? null,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      status: body.status ?? "active",
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create MAG" },
        { status: 500 }
      );
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error("Error creating MAG:", error);
    return NextResponse.json(
      { error: "Failed to create MAG" },
      { status: 500 }
    );
  }
}
