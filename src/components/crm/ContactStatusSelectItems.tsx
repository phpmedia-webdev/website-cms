"use client";

import { SelectItem } from "@/components/ui/select";
import { normalizeHex } from "@/lib/event-type-colors";
import type { CrmContactStatusOption } from "@/lib/supabase/settings";

const FALLBACK_DOT = "#94a3b8";

/** Color dot for CRM contact status (Customizer `contact_status` scope). */
export function ContactStatusColorDot({ color }: { color: string | null | undefined }) {
  const bg =
    color != null && String(color).trim() ? normalizeHex(String(color)) : FALLBACK_DOT;
  return (
    <span
      className="size-2.5 shrink-0 rounded-full border border-black/15 dark:border-white/25"
      style={{ backgroundColor: bg }}
      aria-hidden
    />
  );
}

export function ContactStatusSelectItems({
  contactStatuses,
}: {
  contactStatuses: CrmContactStatusOption[];
}) {
  return contactStatuses.map((s) => (
    <SelectItem key={s.slug} value={s.slug} textValue={s.label}>
      <span className="flex min-w-0 items-center gap-2">
        <ContactStatusColorDot color={s.color} />
        <span className="truncate">{s.label}</span>
      </span>
    </SelectItem>
  ));
}
