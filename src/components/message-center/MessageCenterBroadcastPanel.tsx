"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
 * Folded composer under “Broadcast Announcements” on the full Message Center page.
 * Audience + compose; MAG posts use `mag_group` threads; team uses admin timeline rows.
 */
export function MessageCenterBroadcastPanel({ mags }: MessageCenterBroadcastPanelProps) {
  const router = useRouter();
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
  const [sending, setSending] = useState(false);

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

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/message-center/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          allUsers: allUsers,
          magIds: allUsers ? [] : [...selectedMagIds],
          teamUserIds: allUsers ? [] : [...selectedTeamIds],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        magThreadsPosted?: number;
        teamInboxRows?: number;
        memberPortalRows?: number;
        errors?: string[];
      };
      if (!res.ok) {
        setStatusMessage(typeof data?.error === "string" ? data.error : "Could not send announcement");
        return;
      }
      const magN = data.magThreadsPosted ?? 0;
      const teamN = data.teamInboxRows ?? 0;
      const memberN = data.memberPortalRows ?? 0;
      const parts = [
        magN ? `${magN} MAG room${magN === 1 ? "" : "s"}` : null,
        memberN
          ? `${memberN} member portal inbox${memberN === 1 ? "" : "es"} (no MAG)`
          : null,
        teamN ? `${teamN} team inbox${teamN === 1 ? "" : "es"}` : null,
      ].filter(Boolean);
      let msg = parts.length ? `Sent to ${parts.join(" and ")}.` : "Broadcast completed.";
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        msg += ` Some targets failed (${data.errors.length}).`;
      }
      setStatusMessage(msg);
      setBody("");
      setAllUsers(false);
      setSelectedMagIds(new Set());
      setSelectedTeamIds(new Set());
      router.refresh();
    } catch {
      setStatusMessage("Could not send announcement");
    } finally {
      setSending(false);
    }
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
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border",
            "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
          )}
          aria-hidden
        >
          <Megaphone className="size-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-foreground">Compose your Announcement</span>
          <span className="block text-xs font-normal text-muted-foreground truncate">
            MAGs, team inboxes, or all GPUM rooms
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
            Pick recipients below. <span className="text-foreground font-medium">All GPUM users</span> posts one message
            to every active MAG group room (enrolled members see it under Messages) and a client-visible copy to
            registered members who are not in any MAG.{" "}
            <span className="text-foreground font-medium">Team</span> delivers to selected staff inboxes (admin Message
            Center only). Prefer MAGs when you can instead of tenant-wide.
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
              Announcement text
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
            <Button type="button" onClick={handleSend} disabled={!canSend || sending}>
              {sending ? "Sending…" : "Send announcement"}
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
