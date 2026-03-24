"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Users } from "lucide-react";
import { TaskBentoPanelTitle } from "@/components/tasks/TaskBentoPanelTitle";
import {
  DirectoryParticipantPicker,
  ADMIN_PICKER_DROPDOWN_CLASS,
  type DirectoryPickerRow,
  parseDirectoryParticipantCompositeId,
  toDirectoryParticipantCompositeId,
} from "@/components/pickers";
import { AssigneeListItem } from "@/components/crm/TaskAssigneesReadOnlyCard";
import type { TaskFollowerWithLabel } from "@/lib/tasks/task-follower-types";

export type { TaskFollowerWithLabel } from "@/lib/tasks/task-follower-types";

interface TaskFollowersSectionProps {
  taskId: string;
  initialFollowers: TaskFollowerWithLabel[];
  /** Kept for call-site compatibility; assignees are chosen from tenant Directory (team + contacts). */
  projectId?: string | null;
  /** Detail view: list only, no add/remove. */
  readOnly?: boolean;
}

function followerCompositeId(f: TaskFollowerWithLabel): string | null {
  if (f.user_id) return toDirectoryParticipantCompositeId("team_member", f.user_id);
  if (f.contact_id) return toDirectoryParticipantCompositeId("crm_contact", f.contact_id);
  return null;
}

function labelForCompositeId(rows: DirectoryPickerRow[], compositeId: string): string {
  const parsed = parseDirectoryParticipantCompositeId(compositeId);
  if (!parsed) return "Assignee";
  const row = rows.find((r) => r.source_type === parsed.source_type && r.source_id === parsed.source_id);
  return row?.display_label?.trim() || "Assignee";
}

/**
 * Task assignees: avatar + name list; add via modal + Directory picker (team + contacts), same as calendar events.
 */
export function TaskFollowersSection({
  taskId,
  initialFollowers,
  readOnly = false,
}: TaskFollowersSectionProps) {
  const router = useRouter();
  const [followers, setFollowers] = useState<TaskFollowerWithLabel[]>(initialFollowers);
  const [modalOpen, setModalOpen] = useState(false);
  const [directoryRows, setDirectoryRows] = useState<DirectoryPickerRow[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [modalSelection, setModalSelection] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFollowers(initialFollowers);
  }, [initialFollowers]);

  const assignedCompositeIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of followers) {
      const id = followerCompositeId(f);
      if (id) s.add(id);
    }
    return s;
  }, [followers]);

  const directoryRowsForPicker = useMemo(() => {
    return directoryRows.filter((row) => {
      if (row.source_type !== "team_member" && row.source_type !== "crm_contact") return false;
      const id = toDirectoryParticipantCompositeId(row.source_type, row.source_id);
      return !assignedCompositeIds.has(id);
    });
  }, [directoryRows, assignedCompositeIds]);

  const loadDirectory = useCallback(() => {
    if (directoryLoaded || directoryLoading) return;
    setDirectoryLoading(true);
    fetch("/api/directory?limit=5000")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        setDirectoryRows(rows as DirectoryPickerRow[]);
        setDirectoryLoaded(true);
      })
      .catch(() => {
        setDirectoryRows([]);
        setDirectoryLoaded(true);
      })
      .finally(() => setDirectoryLoading(false));
  }, [directoryLoaded, directoryLoading]);

  const openAddModal = () => {
    setError(null);
    setModalSelection(new Set());
    setModalOpen(true);
    loadDirectory();
  };

  const addSelectedAssignees = async () => {
    if (modalSelection.size === 0) return;
    setError(null);
    setAdding(true);
    const added: TaskFollowerWithLabel[] = [];
    const failures: string[] = [];

    try {
      for (const compositeId of modalSelection) {
        if (assignedCompositeIds.has(compositeId)) continue;
        const parsed = parseDirectoryParticipantCompositeId(compositeId);
        if (!parsed) continue;
        const body =
          parsed.source_type === "team_member"
            ? { role: "follower", user_id: parsed.source_id }
            : { role: "follower", contact_id: parsed.source_id };

        try {
          const res = await fetch(`/api/tasks/${taskId}/followers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            failures.push(`${labelForCompositeId(directoryRows, compositeId)}: ${data?.error ?? "failed"}`);
            continue;
          }
          const label = labelForCompositeId(directoryRows, compositeId);
          added.push({
            id: data.id as string,
            role: "follower",
            user_id: parsed.source_type === "team_member" ? parsed.source_id : null,
            contact_id: parsed.source_type === "crm_contact" ? parsed.source_id : null,
            label,
          });
        } catch {
          failures.push(labelForCompositeId(directoryRows, compositeId));
        }
      }

      if (added.length > 0) {
        setFollowers((prev) => [...prev, ...added]);
        setModalSelection(new Set());
        setModalOpen(false);
        router.refresh();
      }
      if (failures.length > 0) {
        setError(failures.slice(0, 3).join(" · ") + (failures.length > 3 ? "…" : ""));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (followerId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/followers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: followerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to remove");
        return;
      }
      setFollowers((prev) => prev.filter((f) => f.id !== followerId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  return (
    <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
      <CardHeader className="task-bento-card-header">
        <TaskBentoPanelTitle icon={Users}>Assignees</TaskBentoPanelTitle>
      </CardHeader>
      <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-2">
        {followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignees yet.</p>
        ) : (
          <ul className="space-y-2">
            {followers.map((f) => (
              <AssigneeListItem
                key={f.id}
                follower={f}
                showRole={false}
                trailing={
                  readOnly ? undefined : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(f.id)}
                      aria-label="Remove assignee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        )}

        {!readOnly && (
          <div className="mt-auto pt-1">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-border/60 bg-background/80 shadow-sm backdrop-blur-sm"
              onClick={openAddModal}
            >
              Add Assignee
            </Button>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Add assignees</DialogTitle>
              <DialogDescription>
                Search team members and contacts. Select one or more people, then save.
              </DialogDescription>
            </DialogHeader>
            {directoryLoading ? (
              <p className="text-sm text-muted-foreground">Loading directory…</p>
            ) : (
              <DirectoryParticipantPicker
                directoryRows={directoryRowsForPicker}
                selectedCompositeIds={modalSelection}
                onSelectionChange={setModalSelection}
                placeholder="Type to search team or contacts…"
                className="max-w-none"
                dropdownClassName={`${ADMIN_PICKER_DROPDOWN_CLASS} max-h-60`}
              />
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={adding}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void addSelectedAssignees()}
                disabled={adding || modalSelection.size === 0 || directoryLoading}
              >
                {adding ? "Adding…" : `Add${modalSelection.size > 0 ? ` (${modalSelection.size})` : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
