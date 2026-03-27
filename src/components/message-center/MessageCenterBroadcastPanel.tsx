"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutoSuggestMulti, type AutoSuggestOption } from "@/components/ui/auto-suggest-multi";
import { cn } from "@/lib/utils";

export type BroadcastMagOption = { id: string; name: string; uid: string };

interface MessageCenterBroadcastPanelProps {
  mags: BroadcastMagOption[];
}

/**
 * Folded “Broadcast” strip above the Message Center stream (full page only).
 * Audience + compose UI; delivery hooks to MAG announcement threads TBD.
 */
export function MessageCenterBroadcastPanel({ mags }: MessageCenterBroadcastPanelProps) {
  const [open, setOpen] = useState(false);
  const [allUsers, setAllUsers] = useState(false);
  const [selectedMagIds, setSelectedMagIds] = useState<Set<string>>(() => new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(() => new Set());
  const [body, setBody] = useState("");
  const [teamOptions, setTeamOptions] = useState<AutoSuggestOption[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const magSuggestOptions: AutoSuggestOption[] = useMemo(
    () =>
      mags.map((m) => ({
        id: m.id,
        label: m.name,
        searchText: `${m.uid} ${m.name}`,
      })),
    [mags]
  );

  useEffect(() => {
    if (!open || teamLoaded) return;
    let cancelled = false;
    setTeamLoading(true);
    setTeamError(null);
    fetch("/api/admin/authors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load team"))))
      .then((data: { users?: { id: string; display_name: string | null; email: string }[] }) => {
        if (cancelled) return;
        const users = Array.isArray(data?.users) ? data.users : [];
        setTeamOptions(
          users.map((u) => ({
            id: u.id,
            label: (u.display_name?.trim() || u.email || u.id).trim(),
            searchText: u.email ?? "",
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setTeamError("Could not load team list.");
      })
      .finally(() => {
        if (!cancelled) {
          setTeamLoading(false);
          setTeamLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, teamLoaded]);

  const toggleAllUsers = useCallback(
    (checked: boolean) => {
      setAllUsers(checked);
      setStatusMessage(null);
      if (checked) {
        setSelectedMagIds(new Set());
        setSelectedTeamIds(new Set());
      }
    },
    [setAllUsers]
  );

  const canSend =
    body.trim().length > 0 && (allUsers || selectedMagIds.size > 0 || selectedTeamIds.size > 0);

  const handleSend = () => {
    if (!canSend) return;
    setStatusMessage(
      "Broadcast sending is not connected yet. Audience and message are ready for the next integration step (MAG threads / notifications)."
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card/50 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setStatusMessage(null);
        }}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open ? "border-b border-border bg-muted/40" : "bg-muted/25"
        )}
        aria-expanded={open}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Megaphone className="size-4" aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-foreground">Broadcast</span>
          <span className="block text-xs font-normal text-muted-foreground truncate">
            MAGs, staff, or all GPUM members
          </span>
        </span>
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {open && (
        <div className="space-y-5 px-4 pb-4 pt-3 border-t border-border/60 bg-background/80">
          <p className="text-xs text-muted-foreground">
            Pick recipients below. Use <span className="text-foreground font-medium">All GPUM users</span> only for
            major tenant-wide news; prefer MAGs when you can. <span className="text-foreground font-medium">Team</span>{" "}
            means this site&apos;s staff, not every member.
          </p>

          <div className="flex items-start gap-3 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
            <Checkbox
              id="broadcast-all-users"
              checked={allUsers}
              onCheckedChange={(v) => toggleAllUsers(v === true)}
              className="mt-0.5"
            />
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="broadcast-all-users" className="text-sm font-medium text-amber-950 dark:text-amber-100 cursor-pointer">
                All GPUM users (tenant-wide)
              </Label>
              <p className="text-xs text-muted-foreground">Everyone who can sign in to GPUM here.</p>
            </div>
          </div>

          <div
            className={cn(
              "space-y-5 transition-opacity",
              allUsers && "opacity-45 pointer-events-none select-none"
            )}
            aria-hidden={allUsers}
          >
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Membership groups (MAGs)
              </Label>
              {magSuggestOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active MAGs. Create memberships under CRM first.</p>
              ) : (
                <AutoSuggestMulti
                  placeholder="Add MAGs…"
                  options={magSuggestOptions}
                  selectedIds={selectedMagIds}
                  onSelectionChange={setSelectedMagIds}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team members</Label>
              {teamError ? (
                <p className="text-xs text-destructive">{teamError}</p>
              ) : teamLoading && teamOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading team…</p>
              ) : (
                <AutoSuggestMulti
                  placeholder="Add team members…"
                  options={teamOptions}
                  selectedIds={selectedTeamIds}
                  onSelectionChange={setSelectedTeamIds}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-body" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setStatusMessage(null);
              }}
              placeholder="Write your announcement…"
              className="min-h-[120px] resize-y"
              disabled={false}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSend} disabled={!canSend}>
              Send broadcast
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBody("");
                setAllUsers(false);
                setSelectedMagIds(new Set());
                setSelectedTeamIds(new Set());
                setStatusMessage(null);
              }}
            >
              Reset
            </Button>
          </div>

          {statusMessage ? (
            <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
              {statusMessage}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
