import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getMagById, updateMag, deleteMag } from "@/lib/supabase/crm";
import { ensureMagTagExists } from "@/lib/supabase/taxonomy";

/**
 * GET /api/crm/mags/[id]
 * Get a single MAG (admin).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const mag = await getMagById(id);

    if (!mag) {
      return NextResponse.json(
        { error: "MAG not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mag);
  } catch (error) {
    console.error("Error fetching MAG:", error);
    return NextResponse.json(
      { error: "Failed to fetch MAG" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/mags/[id]
 * Update a MAG (admin). Body: partial { name, uid, description, start_date, end_date, status }.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { mag: updated, error } = await updateMag(id, {
      name: body.name,
      uid: body.uid,
      description: body.description,
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update MAG" },
        { status: 500 }
      );
    }

    if (updated?.uid) {
      const { error: tagErr } = await ensureMagTagExists(updated.uid, updated.name);
      if (tagErr) {
        console.warn("MAG updated but mag-tag ensure failed:", tagErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating MAG:", error);
    return NextResponse.json(
      { error: "Failed to update MAG" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/mags/[id]
 * Delete a MAG (admin). Cascade removes contact–MAG assignments.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { success, error } = await deleteMag(id);

    if (!success && error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete MAG" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting MAG:", error);
    return NextResponse.json(
      { error: "Failed to delete MAG" },
      { status: 500 }
    );
  }
}
