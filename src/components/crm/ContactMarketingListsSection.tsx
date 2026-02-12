"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { ContactMarketingList } from "@/lib/supabase/crm";

const SUGGESTIONS_LIMIT = 12;

interface ContactMarketingListsSectionProps {
  contactId: string;
  initialMarketingLists: ContactMarketingList[];
}

/**
 * Marketing Lists section content for contact detail.
 * Renders search-to-add, suggested lists when empty, and list membership with remove. Parent wraps in Card/accordion.
 */
export function ContactMarketingListsSection({
  contactId,
  initialMarketingLists,
}: ContactMarketingListsSectionProps) {
  const [marketingLists, setMarketingLists] = useState(initialMarketingLists);
  const [listSearch, setListSearch] = useState("");
  const [listResults, setListResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [allLists, setAllLists] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuggestionsLoading(true);
      try {
        const res = await fetch("/api/crm/lists");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setAllLists(Array.isArray(data) ? data.map((l: { id: string; name: string; slug: string }) => ({ id: l.id, name: l.name, slug: l.slug ?? "" })) : []);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const suggestedLists = useMemo(() => {
    return allLists
      .filter((l) => !marketingLists.some((ml) => ml.list_id === l.id))
      .slice(0, SUGGESTIONS_LIMIT);
  }, [allLists, marketingLists]);

  const handleListSearch = async (q: string) => {
    setListSearch(q);
    if (q.length < 1) {
      setListResults([]);
      return;
    }
    const res = await fetch(`/api/crm/lists/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setListResults(data.filter((l: { id: string }) => !marketingLists.some((ml) => ml.list_id === l.id)));
    }
  };

  const handleAddList = async (listId: string, listName: string, listSlug: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list_id: listId }),
    });
    if (res.ok) {
      setMarketingLists((prev) => [
        ...prev,
        {
          id: "",
          contact_id: contactId,
          list_id: listId,
          list_name: listName,
          list_slug: listSlug,
          added_at: new Date().toISOString(),
        },
      ]);
      setListSearch("");
      setListResults([]);
    }
  };

  const handleRemoveList = async (listId: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/lists`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list_id: listId }),
    });
    if (res.ok) {
      setMarketingLists((prev) => prev.filter((l) => l.list_id !== listId));
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search lists to add..."
          value={listSearch}
          onChange={(e) => handleListSearch(e.target.value)}
          className="pl-7 h-8 text-sm"
        />
        {listResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
            {listResults.map((l) => (
              <button
                key={l.id}
                type="button"
                className="w-full text-left px-2 py-1.5 hover:bg-muted text-sm"
                onClick={() => handleAddList(l.id, l.name, l.slug)}
              >
                {l.name} <span className="text-muted-foreground">({l.slug})</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {listSearch.length === 0 && suggestedLists.length > 0 && (
        <div className="rounded-md border bg-muted/30 px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested</p>
          <div className="flex flex-wrap gap-1">
            {suggestedLists.map((l) => (
              <button
                key={l.id}
                type="button"
                className="inline-flex items-center rounded-md bg-background px-2 py-1 text-xs border hover:bg-muted"
                onClick={() => handleAddList(l.id, l.name, l.slug)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {listSearch.length === 0 && !suggestionsLoading && suggestedLists.length === 0 && allLists.length > 0 && (
        <p className="text-xs text-muted-foreground">Contact is in all marketing lists.</p>
      )}
      {marketingLists.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not in any marketing lists</p>
      ) : (
        <ul className="space-y-0.5">
          {marketingLists.map((l) => (
            <li key={l.list_id} className="flex items-center justify-between text-sm py-0.5">
              <span>{l.list_name}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveList(l.list_id)}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
