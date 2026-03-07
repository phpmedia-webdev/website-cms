/**
 * POST /api/crm/contacts/[id]/send-email
 * Send a transactional email to the contact and log it in the activity stream.
 * Body: { subject: string, body: string, attachments?: { filename: string; content: string }[] } (content = base64).
 * Uses tenant SMTP (src/lib/email). Creates a CRM note with note_type 'email_sent'.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getContactById, createNote } from "@/lib/supabase/crm";
import { sendEmail } from "@/lib/email/send";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: contactId } = await params;
    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    const email = contact.email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: "Contact has no email address" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const attachments = Array.isArray(body?.attachments)
      ? (body.attachments as { filename?: string; content?: string }[])
          .filter((a) => typeof a?.filename === "string" && typeof a?.content === "string")
          .map((a) => ({ filename: a.filename!, content: a.content! }))
      : undefined;

    const sent = await sendEmail({
      to: email,
      subject: subject || "(No subject)",
      text: text || "(No message body)",
      attachments,
    });
    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send email. Check SMTP configuration." },
        { status: 500 }
      );
    }

    const snippet = text.slice(0, 200);
    const attachmentNote =
      attachments?.length ? `\n\n(${attachments.length} attachment${attachments.length > 1 ? "s" : ""})` : "";
    const noteBody = `Subject: ${subject || "(No subject)"}\n\n${snippet}${text.length > 200 ? "…" : ""}${attachmentNote}`;
    const { note, error: noteError } = await createNote(
      contactId,
      noteBody,
      user.id,
      "email_sent"
    );
    if (noteError) {
      console.warn("Send email: note log failed", noteError);
      return NextResponse.json(
        { error: "Email sent but failed to log to activity stream." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Send contact email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
