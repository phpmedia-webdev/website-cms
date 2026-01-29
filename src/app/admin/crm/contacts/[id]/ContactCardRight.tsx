"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyMessageToNotesButton } from "./CopyMessageToNotesButton";

interface ContactCardRightProps {
  contactId: string;
  message: string | null;
  sourceLabel: string;
}

export function ContactCardRight({
  contactId,
  message,
  sourceLabel,
}: ContactCardRightProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-col flex-1 min-h-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
        <div
          className="rounded border bg-muted/30 px-2 py-1.5 flex-1 min-h-[7.5rem] overflow-y-auto whitespace-pre-wrap text-sm"
          style={{ height: "7.5rem" }}
        >
          {message?.trim() ? message : "—"}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground leading-tight shrink-0">
          Source: {sourceLabel}
        </p>
        <CopyMessageToNotesButton contactId={contactId} message={message} />
      </div>
      <div className="flex justify-end pt-1 mt-auto">
        <Button variant="outline" size="sm" className="h-8" asChild>
          <Link href={`/admin/crm/contacts/${contactId}/edit`}>Edit</Link>
        </Button>
      </div>
    </div>
  );
}
