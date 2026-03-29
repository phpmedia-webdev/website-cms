"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import type { TaskFollowerWithLabel, TaskLinkedContactSummary } from "@/lib/tasks/task-follower-types";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";

export type { TaskFollowerWithLabel, TaskLinkedContactSummary } from "@/lib/tasks/task-follower-types";

interface TaskFollowersSectionProps {
  taskId: string;
  initialFollowers: TaskFollowerWithLabel[];
  /** Kept for call-site compatibility; assignees are chosen from tenant Directory (team + contacts). */
  projectId?: string | null;
  /** Detail view: list only, no add/remove. */
  readOnly?: boolean;
  /** CRM contact linked on the task row (`tasks.contact_id`); contacts only, not organizations. */
  initialLinkedContact: TaskLinkedContactSummary | null;
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
  projectId,
  readOnly = false,
  initialLinkedContact,
}: TaskFollowersSectionProps) {
  const router = useRouter();
  const [followers, setFollowers] = useState<TaskFollowerWithLabel[]>(initialFollowers);
  const [linkedContact, setLinkedContact] = useState<TaskLinkedContactSummary | null>(initialLinkedContact);
  const [modalOpen, setModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [directoryRows, setDirectoryRows] = useState<DirectoryPickerRow[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [modalSelection, setModalSelection] = useState<Set<string>>(() => new Set());
  const [contactModalSelection, setContactModalSelection] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectScopeLoading, setProjectScopeLoading] = useState(false);
  const [projectMemberUserIds, setProjectMemberUserIds] = useState<Set<string>>(() => new Set());
  const [projectMemberContactIds, setProjectMemberContactIds] = useState<Set<string>>(() => new Set());
  const [projectAllowedContactIds, setProjectAllowedContactIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setFollowers(initialFollowers);
  }, [initialFollowers]);

  useEffect(() => {
    setLinkedContact(initialLinkedContact);
  }, [initialLinkedContact]);

  useEffect(() => {
    const pid = projectId?.trim();
    if (!pid) {
      setProjectMemberUserIds(new Set());
      setProjectMemberContactIds(new Set());
      setProjectAllowedContactIds(new Set());
      setProjectScopeLoading(false);
      return;
    }
    let cancelled = false;
    setProjectScopeLoading(true);
    Promise.all([
      fetch(`/api/projects/${pid}/members`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/projects/${pid}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(async ([rows, project]) => {
        if (cancelled) return;
        const userIds = new Set<string>();
        const contactIds = new Set<string>();
        const allowedContactIds = new Set<string>();
        if (Array.isArray(rows)) {
          for (const raw of rows) {
            if (raw && typeof raw === "object") {
              const rec = raw as { user_id?: unknown; contact_id?: unknown };
              if (typeof rec.user_id === "string" && rec.user_id.trim()) {
                userIds.add(rec.user_id.trim());
              }
              if (typeof rec.contact_id === "string" && rec.contact_id.trim()) {
                const cid = rec.contact_id.trim();
                contactIds.add(cid);
                allowedContactIds.add(cid);
              }
            }
          }
        }
        const clientOrgId =
          project && typeof project === "object"
            ? String((project as { client_organization_id?: unknown }).client_organization_id ?? "").trim()
            : "";
        if (clientOrgId) {
          const orgRes = await fetch(`/api/crm/organizations/${clientOrgId}/contacts`)
            .then((r) => (r.ok ? r.json() : { contacts: [] }))
            .catch(() => ({ contacts: [] as Array<{ id?: string }> }));
          const orgContacts = Array.isArray(orgRes?.contacts) ? orgRes.contacts : [];
          for (const c of orgContacts) {
            if (c && typeof c === "object" && typeof c.id === "string" && c.id.trim()) {
              allowedContactIds.add(c.id.trim());
            }
          }
        }
        setProjectMemberUserIds(userIds);
        setProjectMemberContactIds(contactIds);
        setProjectAllowedContactIds(allowedContactIds);
      })
      .catch(() => {
        if (!cancelled) {
          setProjectMemberUserIds(new Set());
          setProjectMemberContactIds(new Set());
          setProjectAllowedContactIds(new Set());
        }
      })
      .finally(() => {
        if (!cancelled) setProjectScopeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const hasProjectScope = !!projectId?.trim();

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
      if (hasProjectScope) {
        if (row.source_type === "team_member" && !projectMemberUserIds.has(row.source_id)) {
          return false;
        }
        if (row.source_type === "crm_contact" && !projectMemberContactIds.has(row.source_id)) {
          return false;
        }
      }
      const id = toDirectoryParticipantCompositeId(row.source_type, row.source_id);
      return !assignedCompositeIds.has(id);
    });
  }, [directoryRows, assignedCompositeIds, hasProjectScope, projectMemberUserIds, projectMemberContactIds]);

  const directoryContactRowsOnly = useMemo(
    () =>
      directoryRows.filter(
        (row) =>
          row.source_type === "crm_contact" &&
          (!hasProjectScope || projectAllowedContactIds.has(row.source_id))
      ),
    [directoryRows, hasProjectScope, projectAllowedContactIds]
  );

  const directoryTeamRowCount = useMemo(
    () => directoryRows.filter((row) => row.source_type === "team_member").length,
    [directoryRows]
  );

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

  const openContactModal = () => {
    setError(null);
    setContactModalSelection(new Set());
    setContactModalOpen(true);
    loadDirectory();
  };

  const saveTaskContactId = async (contactId: string | null, labelHint: string | null) => {
    setError(null);
    setContactSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to update contact");
        return false;
      }
      if (!contactId) {
        setLinkedContact(null);
      } else {
        const baseLabel = labelHint?.trim() || "Contact";
        let avatar_initials: string | undefined;
        try {
          const crRes = await fetch(`/api/crm/contacts/${contactId}`);
          const cr = crRes.ok ? ((await crRes.json().catch(() => null)) as null | {
            first_name?: string | null;
            last_name?: string | null;
            email?: string | null;
          }) : null;
          if (cr) {
            avatar_initials = initialsFromFirstLast(cr.first_name, cr.last_name, cr.email);
          }
        } catch {
          /* keep undefined; AssigneeListItem falls back to label-based initials */
        }
        setLinkedContact({ id: contactId, label: baseLabel, avatar_initials });
      }
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update contact");
      return false;
    } finally {
      setContactSaving(false);
    }
  };

  const linkSelectedContact = async () => {
    const [first] = Array.from(contactModalSelection);
    if (!first) return;
    const parsed = parseDirectoryParticipantCompositeId(first);
    if (!parsed || parsed.source_type !== "crm_contact") return;
    const label = labelForCompositeId(directoryRows, first);
    const ok = await saveTaskContactId(parsed.source_id, label);
    if (ok) {
      setContactModalSelection(new Set());
      setContactModalOpen(false);
    }
  };

  const clearLinkedContact = async () => {
    const ok = await saveTaskContactId(null, null);
    if (ok) setContactModalOpen(false);
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
        <TaskBentoPanelTitle icon={Users}>Members</TaskBentoPanelTitle>
      </CardHeader>
      <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Contact</p>
          {linkedContact ? (
            <AssigneeListItem
              follower={{
                id: `task-contact-${linkedContact.id}`,
                role: "follower",
                user_id: null,
                contact_id: linkedContact.id,
                label: linkedContact.label,
                avatar_initials: linkedContact.avatar_initials,
              }}
              showRole={false}
              trailing={
                readOnly ? (
                  <Link
                    href={`/admin/crm/contacts/${linkedContact.id}`}
                    className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View
                  </Link>
                ) : (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={contactSaving}
                      onClick={() => void clearLinkedContact()}
                      aria-label="Remove linked contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                      <Link href={`/admin/crm/contacts/${linkedContact.id}`}>View</Link>
                    </Button>
                  </div>
                )
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">No contact linked.</p>
          )}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full rounded-xl border-border/60 bg-background/80 shadow-sm backdrop-blur-sm"
              onClick={openContactModal}
              disabled={contactSaving}
            >
              {linkedContact ? "Change contact" : "Add contact"}
            </Button>
          )}
        </div>

        <div className="border-t border-border/60 pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Members</p>
          {followers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
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
                        aria-label="Remove member"
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
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-border/60 bg-background/80 shadow-sm backdrop-blur-sm"
                onClick={openAddModal}
              >
                Add member
              </Button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
          <DialogContent className="max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>{linkedContact ? "Change contact" : "Add contact"}</DialogTitle>
              <DialogDescription>
                Choose a CRM contact for this task (e.g. ticket requester). Only contacts are listed.
              </DialogDescription>
            </DialogHeader>
            {directoryLoading ? (
              <p className="text-sm text-muted-foreground">Loading directory…</p>
            ) : projectScopeLoading ? (
              <p className="text-sm text-muted-foreground">Loading project members…</p>
            ) : (
              <DirectoryParticipantPicker
                directoryRows={directoryContactRowsOnly}
                selectedCompositeIds={contactModalSelection}
                onSelectionChange={setContactModalSelection}
                placeholder="Search contacts…"
                className="max-w-none"
                dropdownClassName={`${ADMIN_PICKER_DROPDOWN_CLASS} max-h-60`}
                contactsOnly
                maxSelections={1}
              />
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContactModalOpen(false)}
                disabled={contactSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void linkSelectedContact()}
                disabled={
                  contactSaving || contactModalSelection.size === 0 || directoryLoading || projectScopeLoading
                }
              >
                {contactSaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Add members</DialogTitle>
              <DialogDescription>
                Search team members and contacts. Select one or more people, then save.
              </DialogDescription>
            </DialogHeader>
            {!directoryLoading && directoryLoaded && directoryTeamRowCount === 0 && (
              <p className="text-xs text-muted-foreground">
                No team members in the directory for this deployment. Team rows come from{" "}
                <code className="rounded bg-muted px-1">tenant_user_assignments</code> for the site whose{" "}
                <code className="rounded bg-muted px-1">tenant_sites.schema_name</code> matches{" "}
                <code className="rounded bg-muted px-1">NEXT_PUBLIC_CLIENT_SCHEMA</code>. CRM contacts still
                load from your tenant schema.
              </p>
            )}
            {directoryLoading ? (
              <p className="text-sm text-muted-foreground">Loading directory…</p>
            ) : projectScopeLoading ? (
              <p className="text-sm text-muted-foreground">Loading project members…</p>
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
                disabled={adding || modalSelection.size === 0 || directoryLoading || projectScopeLoading}
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
