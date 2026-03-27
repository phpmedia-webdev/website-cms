"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ContactStatusColorDot } from "@/components/crm/ContactStatusSelectItems";
import { contrastTextOnHex, normalizeHex } from "@/lib/event-type-colors";
import { findCrmContactStatusOption, type CrmContactStatusOption } from "@/lib/supabase/settings";
import { cn } from "@/lib/utils";

interface ContactStatusQuickButtonProps {
  contactId: string;
  status: string;
  contactStatuses: CrmContactStatusOption[];
  className?: string;
}

export function ContactStatusQuickButton({
  contactId,
  status,
  contactStatuses,
  className,
}: ContactStatusQuickButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const config = findCrmContactStatusOption(contactStatuses, status);
  const label = config?.label ?? status;
  const statusSlug = config?.slug ?? status;
  const solidBg = config?.color?.trim() ? normalizeHex(config.color) : null;

  const handleSelect = async (slug: string) => {
    if (slug === statusSlug) {
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "h-8 shrink-0 text-xs font-medium",
          solidBg && "border-transparent shadow-sm hover:opacity-90",
          className
        )}
        style={
          solidBg
            ? { backgroundColor: solidBg, color: contrastTextOnHex(solidBg) }
            : undefined
        }
        title="Quick change status"
        aria-label={`Change contact status. Current: ${label}`}
      >
        {label}
      </Button>
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
                className="flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <ContactStatusColorDot color={s.color} />
                {s.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
