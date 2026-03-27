"use client";

import { ContactStatusQuickButton } from "@/components/crm/ContactStatusQuickButton";
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
  return <ContactStatusQuickButton contactId={contactId} status={status} contactStatuses={contactStatuses} />;
}
