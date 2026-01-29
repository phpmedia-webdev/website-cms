"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketingList } from "@/lib/supabase/crm";
import type { ContactMarketingList } from "@/lib/supabase/crm";

interface ContactCardMarketingListsProps {
  contactId: string;
  allLists: MarketingList[];
  initialContactLists: ContactMarketingList[];
}

export function ContactCardMarketingLists({
  contactId,
  allLists,
  initialContactLists,
}: ContactCardMarketingListsProps) {
  const router = useRouter();
  const [inListIds, setInListIds] = useState<Set<string>>(
    () => new Set(initialContactLists.map((l) => l.list_id))
  );
  const [syncing, setSyncing] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = new Set(
      Array.from(e.target.selectedOptions, (o) => o.value)
    );
    const added = [...selected].filter((id) => !inListIds.has(id));
    const removed = [...inListIds].filter((id) => !selected.has(id));
    if (added.length === 0 && removed.length === 0) return;
    setSyncing(true);
    try {
      for (const listId of added) {
        await fetch(`/api/crm/contacts/${contactId}/lists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ list_id: listId }),
        });
      }
      for (const listId of removed) {
        await fetch(`/api/crm/contacts/${contactId}/lists`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ list_id: listId }),
        });
      }
      setInListIds(selected);
      router.refresh();
    } finally {
      setSyncing(false);
    }
  };

  if (allLists.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">No marketing lists.</p>
    );
  }

  return (
    <select
      multiple
      size={3}
      value={Array.from(inListIds)}
      onChange={handleChange}
      disabled={syncing}
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {allLists.map((list) => (
        <option key={list.id} value={list.id}>
          {list.name}
        </option>
      ))}
    </select>
  );
}
