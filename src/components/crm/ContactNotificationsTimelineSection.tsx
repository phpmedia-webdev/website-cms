"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import type { ContactNotificationsTimelineRow } from "@/lib/supabase/contact-notifications-timeline";

const SECTION_TITLE = "Messages and Notifications";

interface ContactNotificationsTimelineSectionProps {
  contactId: string;
}

type ComposerEntryType = "message" | "private";

/** Filter by stream entry kind; internal vs client-visible follows from kind (e.g. staff_note). */
const TIMELINE_KIND_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "message", label: "Messages" },
  { value: "staff_note", label: "Private notes" },
  { value: "other", label: "Other" },
];

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Single-line title from body for API (required title column). */
function titleFromBody(body: string, fallback: string): string {
  const line = body.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return fallback;
  if (line.length > 200) return `${line.slice(0, 197)}…`;
  return line;
}

function rowMatchesKindFilter(row: ContactNotificationsTimelineRow, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "message") return row.kind === "message";
  if (filter === "staff_note") return row.kind === "staff_note";
  if (filter === "other") return row.kind !== "message" && row.kind !== "staff_note";
  return true;
}

function rowMatchesVisibilityFilter(row: ContactNotificationsTimelineRow, filter: string): boolean {
  if (filter === "all") return true;
  return row.visibility === filter;
}

/**
 * Phase 18C: `contact_notifications_timeline` on CRM contact detail (admin).
 */
export function ContactNotificationsTimelineSection({
  contactId,
}: ContactNotificationsTimelineSectionProps) {
  const [rows, setRows] = useState<ContactNotificationsTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState<ComposerEntryType>("message");
  const [composerBody, setComposerBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/crm/contacts/${contactId}/notifications-timeline?limit=200`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof json.error === "string" ? json.error : "Failed to load");
        setRows([]);
        return;
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch {
      setLoadError("Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    let list = rows.filter((row) => rowMatchesKindFilter(row, kindFilter));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => {
        const hay = `${row.title ?? ""} ${row.body ?? ""} ${row.kind}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [rows, search, kindFilter]);

  const openAddEntry = () => {
    setEntryType("message");
    setComposerBody("");
    setAddEntryOpen(true);
    setLoadError(null);
  };

  const closeAddEntry = () => {
    setAddEntryOpen(false);
    setComposerBody("");
  };

  const submitEntry = async () => {
    if (!composerBody.trim()) return;
    setSaving(true);
    try {
      const body = composerBody.trim();
      const payload =
        entryType === "message"
          ? {
              kind: "message",
              visibility: "client_visible" as const,
              title: titleFromBody(body, "Message"),
              body,
            }
          : {
              kind: "staff_note",
              visibility: "admin_only" as const,
              title: titleFromBody(body, "Private note"),
              body,
            };

      const res = await fetch(`/api/crm/contacts/${contactId}/notifications-timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof json.error === "string" ? json.error : "Save failed");
        return;
      }
      if (json.data) {
        setRows((prev) => [json.data as ContactNotificationsTimelineRow, ...prev]);
      }
      closeAddEntry();
      setLoadError(null);
    } finally {
      setSaving(false);
    }
  };

  const primaryLine = (row: ContactNotificationsTimelineRow) => {
    if (row.body?.trim()) return row.body.trim();
    return row.title || row.kind;
  };

  /** Drill-down: wire route or drawer when stream types and detail UX are final. */
  const handleStreamRowActivate = (row: ContactNotificationsTimelineRow) => {
    // TODO(Phase 18C): navigate to detail or open drawer, e.g. `?entry=${row.id}` or /timeline/[id]
    void row;
  };

  return (
    <>
      <div className="rounded-lg border bg-card mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-4 border-b">
          <span className="text-sm font-semibold">{SECTION_TITLE}</span>
          <Button type="button" size="sm" className="h-7 text-xs shrink-0" onClick={openAddEntry}>
            Add Entry
          </Button>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-8 text-sm"
                aria-label={`Search ${SECTION_TITLE}`}
              />
            </div>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-8 shrink-0 rounded-md border border-input bg-background px-2 py-1 text-xs min-w-[7.5rem]"
              aria-label="Filter by kind"
            >
              {TIMELINE_KIND_FILTER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {loadError && (
            <p className="text-xs text-destructive" role="alert">
              {loadError}
            </p>
          )}

          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading && rows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Loading…</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                {rows.length === 0 ? "No entries yet." : "No entries match your search or filters."}
              </p>
            ) : (
              filteredRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  data-timeline-entry-id={row.id}
                  className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={() => handleStreamRowActivate(row)}
                >
                  <p className="truncate">{primaryLine(row)}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{formatWhen(row.created_at)}</span>
                    {row.kind ? (
                      <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-muted">
                        {row.kind}
                      </span>
                    ) : null}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {addEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4"
            role="dialog"
            aria-labelledby="ntl-add-entry-title"
          >
            <h2 id="ntl-add-entry-title" className="text-lg font-semibold">
              Add entry
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose whether the client can see this entry, then enter the text.
            </p>
            <div className="space-y-2">
              <Label htmlFor="ntl-entry-type">Entry type</Label>
              <select
                id="ntl-entry-type"
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as ComposerEntryType)}
              >
                <option value="message">Message to client (visible to client)</option>
                <option value="private">Internal note (staff only)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ntl-composer-body">Content</Label>
              <textarea
                id="ntl-composer-body"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                placeholder={
                  entryType === "message"
                    ? "Message the client can see…"
                    : "Note for staff only…"
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeAddEntry} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submitEntry} disabled={saving || !composerBody.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
