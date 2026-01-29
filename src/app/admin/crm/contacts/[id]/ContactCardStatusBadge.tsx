"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";

interface ContactCardStatusBadgeProps {
  contactId: string;
  status: string;
  contactStatuses: CrmContactStatusOption[];
}

export function ContactCardStatusBadge({
  contactId,
  status,
  contactStatuses,
}: ContactCardStatusBadgeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const config = contactStatuses.find((s) => s.slug === status);
  const label = config?.label ?? status;

  const handleSelect = async (slug: string) => {
    if (slug === status) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: slug }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium shrink-0 cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${!config?.color ? "bg-muted text-foreground" : ""}`}
        style={
          config?.color
            ? { backgroundColor: config.color, color: "white" }
            : undefined
        }
        title="Change status"
      >
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 py-2">
            {contactStatuses.map((s) => (
              <button
                key={s.slug}
                type="button"
                disabled={saving}
                onClick={() => handleSelect(s.slug)}
                className={`w-full text-left rounded px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${!s.color ? "bg-muted text-foreground" : ""}`}
                style={
                  s.color
                    ? { backgroundColor: s.color, color: "white" }
                    : undefined
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
