"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { ComposeEmail, type ComposeEmailPayload } from "@/components/email/ComposeEmail";

interface ContactComposeEmailButtonProps {
  contactId: string;
  contactEmail: string | null;
  displayName: string;
}

export function ContactComposeEmailButton({
  contactId,
  contactEmail,
  displayName,
}: ContactComposeEmailButtonProps) {
  const router = useRouter();
  const canSend = !!contactEmail?.trim();

  const handleSubmit = async (payload: ComposeEmailPayload) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: payload.subject,
        body: payload.body,
        attachments: payload.attachments,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to send email");
    }
  };

  return (
    <ComposeEmail
      to={contactEmail ?? ""}
      toLabel={displayName}
      onSubmit={handleSubmit}
      onSent={() => router.refresh()}
      disabled={!canSend}
      title="Compose email"
      allowAttachments
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        title={!canSend ? "Contact has no email address" : "Compose email to contact"}
      >
        <Mail className="h-3.5 w-3.5 mr-1.5" />
        Compose email
      </Button>
    </ComposeEmail>
  );
}
