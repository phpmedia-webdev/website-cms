import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { withRateLimit } from "@/lib/api/middleware";

/**
 * POST /api/forms/[formId]/submit
 * Submit form data
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify form exists
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("*")
      .or(`id.eq.${formId},slug.eq.${formId}`)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Validate form fields
    const fields = form.fields as Array<{
      name: string;
      required?: boolean;
      type: string;
    }>;

    for (const field of fields) {
      if (field.required && !body[field.name]) {
        return NextResponse.json(
          { error: `Field ${field.name} is required` },
          { status: 400 }
        );
      }
    }

    // Store submission
    const { data: submission, error: submitError } = await supabase
      .from("form_submissions")
      .insert({
        form_id: form.id,
        data: body,
        status: "new",
      })
      .select()
      .single();

    if (submitError) {
      return NextResponse.json(
        { error: submitError.message },
        { status: 500 }
      );
    }

    // Return success response
    const successMessage =
      (form.settings as { success_message?: string })?.success_message ||
      "Thank you for your submission!";

    return NextResponse.json({
      success: true,
      message: successMessage,
      submission_id: submission.id,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler);
