import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { generateSingleUseCodes } from "@/lib/mags/code-generator";

/** POST - Generate single-use codes for a batch */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: batchId } = await params;
    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(1, Number(body.count) || 50), 500);

    const { codes, error } = await generateSingleUseCodes(batchId, count);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes });
  } catch (e) {
    console.error("Error generating codes:", e);
    return NextResponse.json(
      { error: "Failed to generate codes" },
      { status: 500 }
    );
  }
}
