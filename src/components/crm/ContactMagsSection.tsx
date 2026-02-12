"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { ContactMag } from "@/lib/supabase/crm";

const SUGGESTIONS_LIMIT = 12;

interface ContactMagsSectionProps {
  contactId: string;
  initialMags: ContactMag[];
}

/**
 * Memberships (MAGs) section content for contact detail.
 * Renders search-to-add, suggested MAGs when empty, list with remove, and confirm-remove dialog. Parent wraps in Card/accordion.
 */
export function ContactMagsSection({ contactId, initialMags }: ContactMagsSectionProps) {
  const [mags, setMags] = useState(initialMags);
  const [magSearch, setMagSearch] = useState("");
  const [magResults, setMagResults] = useState<{ id: string; name: string; uid: string }[]>([]);
  const [allMags, setAllMags] = useState<{ id: string; name: string; uid: string }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [confirmRemoveMag, setConfirmRemoveMag] = useState<{ id: string; name: string } | null>(null);
  const [removingMag, setRemovingMag] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSuggestionsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/crm/mags");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled)
          setAllMags(
            Array.isArray(data)
              ? data.map((m: { id: string; name: string; uid: string }) => ({
                  id: m.id,
                  name: m.name,
                  uid: m.uid ?? "",
                }))
              : []
          );
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestedMags = useMemo(() => {
    return allMags.filter((m) => !mags.some((cm) => cm.mag_id === m.id)).slice(0, SUGGESTIONS_LIMIT);
  }, [allMags, mags]);

  const handleMagSearch = async (q: string) => {
    setMagSearch(q);
    if (q.length < 1) {
      setMagResults([]);
      return;
    }
    const res = await fetch(`/api/crm/mags/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setMagResults(data.filter((m: { id: string }) => !mags.some((cm) => cm.mag_id === m.id)));
    }
  };

  const handleAddMag = async (magId: string, magName: string, magUid: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mag_id: magId, assigned_via: "admin" }),
    });
    if (res.ok) {
      setMags((prev) => [
        ...prev,
        {
          id: "",
          contact_id: contactId,
          mag_id: magId,
          mag_name: magName,
          mag_uid: magUid,
          assigned_via: "admin",
          assigned_at: new Date().toISOString(),
        },
      ]);
      setMagSearch("");
      setMagResults([]);
    }
  };

  const handleRemoveMag = (magId: string, magName: string) => {
    setConfirmRemoveMag({ id: magId, name: magName });
  };

  const confirmRemoveMagAction = async () => {
    if (!confirmRemoveMag) return;
    setRemovingMag(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mag_id: confirmRemoveMag.id }),
      });
      if (res.ok) {
        setMags((prev) => prev.filter((m) => m.mag_id !== confirmRemoveMag.id));
      }
    } finally {
      setRemovingMag(false);
      setConfirmRemoveMag(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search MAGs to add..."
            value={magSearch}
            onChange={(e) => handleMagSearch(e.target.value)}
            className="pl-7 pr-8 h-8 text-sm"
          />
          {magSearch && (
            <button
              type="button"
              onClick={() => {
                setMagSearch("");
                setMagResults([]);
              }}
              className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {magResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
              {magResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-2 py-1.5 hover:bg-muted text-sm"
                  onClick={() => handleAddMag(m.id, m.name, m.uid)}
                >
                  {m.name} <span className="text-muted-foreground">({m.uid})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {magSearch.length === 0 && suggestedMags.length > 0 && (
          <div className="rounded-md border bg-muted/30 px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested</p>
            <div className="flex flex-wrap gap-1">
              {suggestedMags.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="inline-flex items-center rounded-md bg-background px-2 py-1 text-xs border hover:bg-muted"
                  onClick={() => handleAddMag(m.id, m.name, m.uid)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {magSearch.length === 0 && !suggestionsLoading && suggestedMags.length === 0 && allMags.length > 0 && (
          <p className="text-xs text-muted-foreground">Contact has all available memberships.</p>
        )}
        {mags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No memberships assigned</p>
        ) : (
          <ul className="space-y-0.5">
            {mags.map((m) => (
              <li key={m.mag_id} className="flex items-center justify-between text-sm py-0.5">
                <span>
                  {m.mag_name} <span className="text-muted-foreground">({m.mag_uid})</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleRemoveMag(m.mag_id, m.mag_name)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmRemoveMag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Remove Membership</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove <strong>&quot;{confirmRemoveMag.name}&quot;</strong> from this contact?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmRemoveMag(null)} disabled={removingMag}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRemoveMagAction} disabled={removingMag}>
                {removingMag ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
