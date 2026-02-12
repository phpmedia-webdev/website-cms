"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";

interface CopyMessageToNotesButtonProps {
  contactId: string;
  message: string | null;
}

export function CopyMessageToNotesButton({ contactId, message }: CopyMessageToNotesButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const hasMessage = message != null && message.trim().length > 0;

  const handleCopy = async () => {
    if (!hasMessage) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: message.trim(),
          note_type: "submission_message",
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      disabled={!hasMessage || loading}
    >
      <Copy className="h-3 w-3 mr-1" />
      {loading ? "Copying…" : "Copy To Activity Stream"}
    </Button>
  );
}
