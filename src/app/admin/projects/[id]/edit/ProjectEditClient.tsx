"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Hash, ImageIcon, UserPlus, X, CheckCircle2 } from "lucide-react";
import type { Project, ProjectMember } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { projectDisplayRef } from "@/lib/supabase/projects";
import {
  DirectoryParticipantPicker,
  type DirectoryPickerRow,
  parseDirectoryParticipantCompositeId,
  toDirectoryParticipantCompositeId,
} from "@/components/pickers/DirectoryParticipantPicker";
import { MediaPickerModal } from "@/components/editor/MediaPickerModal";
import { cn } from "@/lib/utils";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import { initialsFromLabel } from "@/lib/tasks/display-helpers";

interface ProjectEditClientProps {
  project: Project;
  statusTerms: StatusOrTypeTerm[];
  typeTerms: StatusOrTypeTerm[];
  projectRoleTerms: StatusOrTypeTerm[];
  clientDisplayName: string | null;
  clientAvatarInitials: string | null;
  initialProjectMembers: (ProjectMember & {
    label: string;
    role_label: string | null;
    avatar_initials: string;
  })[];
  /** Resolved thumbnail/variant URL when `project.cover_image_id` is set. */
  initialCoverImageUrl: string | null;
}

type SetClientKind = "contact" | "organization";

interface OrgOption {
  id: string;
  name: string;
}

interface ContactOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

function toInputDate(s: string | null): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ProjectEditClient({
  project,
  statusTerms,
  typeTerms,
  projectRoleTerms,
  clientDisplayName,
  clientAvatarInitials,
  initialProjectMembers,
  initialCoverImageUrl,
}: ProjectEditClientProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [statusSlug, setStatusSlug] = useState(project.project_status_slug);
  const [projectTypeSlug, setProjectTypeSlug] = useState(project.project_type_slug ?? "");
  const [startDate, setStartDate] = useState(toInputDate(project.start_date));
  const [dueDate, setDueDate] = useState(toInputDate(project.due_date));
  const [completedDate, setCompletedDate] = useState(toInputDate(project.completed_date));
  const [estimatedHourlyRate, setEstimatedHourlyRate] = useState(
    project.estimated_hourly_rate != null ? String(project.estimated_hourly_rate) : ""
  );
  const [coverImageId, setCoverImageId] = useState<string | null>(project.cover_image_id ?? null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(initialCoverImageUrl);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [markCompleteBusy, setMarkCompleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState(initialProjectMembers);
  const [clientName, setClientName] = useState(clientDisplayName);
  const [clientInitials, setClientInitials] = useState(clientAvatarInitials ?? "?");
  const [clientContactId, setClientContactId] = useState<string | null>(project.contact_id);
  const [clientOrgId, setClientOrgId] = useState<string | null>(project.client_organization_id);

  const completeStatusTerm = useMemo(
    () =>
      statusTerms.find(
        (t) =>
          t.slug.trim().toLowerCase() === "complete" ||
          t.slug.trim().toLowerCase() === "completed"
      ),
    [statusTerms]
  );

  useEffect(() => {
    setProjectMembers(initialProjectMembers);
    setClientName(clientDisplayName);
    setClientInitials(clientAvatarInitials ?? "?");
    setClientContactId(project.contact_id);
    setClientOrgId(project.client_organization_id);
  }, [
    initialProjectMembers,
    clientDisplayName,
    clientAvatarInitials,
    project.contact_id,
    project.client_organization_id,
  ]);

  useEffect(() => {
    setCoverImageId(project.cover_image_id ?? null);
    setCoverPreviewUrl(initialCoverImageUrl);
  }, [project.cover_image_id, initialCoverImageUrl]);

  const [setClientOpen, setSetClientOpen] = useState(false);
  const [setClientKind, setSetClientKind] = useState<SetClientKind>("contact");
  const [setClientContactSearch, setSetClientContactSearch] = useState("");
  const [setClientContacts, setSetClientContacts] = useState<ContactOption[]>([]);
  const [setClientContactsLoading, setSetClientContactsLoading] = useState(false);
  const [setClientSelectedContactId, setSetClientSelectedContactId] = useState("");
  const [setClientSelectedOrgId, setSetClientSelectedOrgId] = useState("");
  const [setClientOrgContacts, setSetClientOrgContacts] = useState<ContactOption[]>([]);
  const [setClientExistingMemberContactIds, setSetClientExistingMemberContactIds] = useState<
    Set<string>
  >(new Set());
  const [setClientSelectedOrgContactIds, setSetClientSelectedOrgContactIds] = useState<Set<string>>(
    new Set()
  );
  const [setClientBusy, setSetClientBusy] = useState(false);
  const [setClientOrgContactsLoading, setSetClientOrgContactsLoading] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [directoryRows, setDirectoryRows] = useState<DirectoryPickerRow[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [modalMemberSelection, setModalMemberSelection] = useState<Set<string>>(new Set());
  const [addMemberRoleSlug, setAddMemberRoleSlug] = useState("");
  const [addMemberBusy, setAddMemberBusy] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<OrgOption[]>([]);

  useEffect(() => {
    if (!addMemberOpen && !setClientOpen) return;
    fetch("/api/crm/organizations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.organizations)) {
          setOrganizations(
            data.organizations.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name }))
          );
        }
      })
      .catch(() => {});
  }, [addMemberOpen, setClientOpen]);

  useEffect(() => {
    if (!setClientOpen || setClientKind !== "contact") return;
    setSetClientContactsLoading(true);
    const q = setClientContactSearch.trim() || " ";
    fetch(`/api/crm/contacts/search?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setSetClientContacts(
          Array.isArray(data.contacts)
            ? data.contacts.map((c: { id: string; full_name: string | null; email: string | null }) => ({
                id: c.id,
                full_name: c.full_name ?? null,
                email: c.email ?? null,
              }))
            : []
        );
      })
      .catch(() => setSetClientContacts([]))
      .finally(() => setSetClientContactsLoading(false));
  }, [setClientOpen, setClientKind, setClientContactSearch]);

  useEffect(() => {
    if (!setClientOpen || setClientKind !== "organization" || !setClientSelectedOrgId) return;
    setSetClientOrgContactsLoading(true);
    Promise.all([
      fetch(`/api/crm/organizations/${setClientSelectedOrgId}/contacts`).then((r) => r.json()),
      fetch(`/api/projects/${project.id}/members`).then((r) => r.json()),
    ])
      .then(([contactsRes, membersRes]) => {
        const list = Array.isArray(contactsRes.contacts) ? contactsRes.contacts : [];
        setSetClientOrgContacts(
          list.map((c: { id: string; full_name: string | null; email: string | null }) => ({
            id: c.id,
            full_name: c.full_name ?? null,
            email: c.email ?? null,
          }))
        );
        const members = Array.isArray(membersRes) ? membersRes : [];
        const contactIds = new Set(
          members
            .map((m: { contact_id: string | null }) => m.contact_id)
            .filter((id: string | null): id is string => id != null)
        );
        setSetClientExistingMemberContactIds(contactIds);
        setSetClientSelectedOrgContactIds(
          new Set(list.map((c: { id: string }) => c.id).filter((id: string) => !contactIds.has(id)))
        );
      })
      .catch(() => {
        setSetClientOrgContacts([]);
        setSetClientExistingMemberContactIds(new Set());
        setSetClientSelectedOrgContactIds(new Set());
      })
      .finally(() => setSetClientOrgContactsLoading(false));
  }, [setClientOpen, setClientKind, setClientSelectedOrgId, project.id]);

  const assignedCompositeIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of projectMembers) {
      if (m.user_id) s.add(toDirectoryParticipantCompositeId("team_member", m.user_id));
      if (m.contact_id) s.add(toDirectoryParticipantCompositeId("crm_contact", m.contact_id));
    }
    return s;
  }, [projectMembers]);

  const directoryRowsForPicker = useMemo(() => {
    return directoryRows.filter((row) => {
      if (row.source_type !== "team_member" && row.source_type !== "crm_contact") return false;
      const id = toDirectoryParticipantCompositeId(
        row.source_type as "team_member" | "crm_contact",
        row.source_id
      );
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
        setDirectoryRows(
          rows.map((r: DirectoryPickerRow) => ({
            source_type: r.source_type,
            source_id: r.source_id,
            display_label: r.display_label,
            subtitle: r.subtitle ?? "",
          }))
        );
        setDirectoryLoaded(true);
      })
      .catch(() => {
        setDirectoryRows([]);
        setDirectoryLoaded(true);
      })
      .finally(() => setDirectoryLoading(false));
  }, [directoryLoaded, directoryLoading]);

  const openAddMembers = () => {
    setAddMemberError(null);
    setModalMemberSelection(new Set());
    setAddMemberRoleSlug("");
    setAddMemberOpen(true);
    loadDirectory();
  };

  const labelForComposite = (compositeId: string): string => {
    const parsed = parseDirectoryParticipantCompositeId(compositeId);
    if (!parsed) return compositeId;
    const row = directoryRows.find(
      (e) => e.source_type === parsed.source_type && e.source_id === parsed.source_id
    );
    return row?.display_label ?? compositeId;
  };

  const runAddDirectoryMembers = async () => {
    if (modalMemberSelection.size === 0) return;
    setAddMemberBusy(true);
    setAddMemberError(null);
    const failures: string[] = [];
    try {
      for (const compositeId of modalMemberSelection) {
        if (assignedCompositeIds.has(compositeId)) continue;
        const parsed = parseDirectoryParticipantCompositeId(compositeId);
        if (!parsed) continue;
        const body =
          parsed.source_type === "team_member"
            ? { user_id: parsed.source_id, role_slug: addMemberRoleSlug.trim() || null }
            : { contact_id: parsed.source_id, role_slug: addMemberRoleSlug.trim() || null };
        const res = await fetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failures.push(`${labelForComposite(compositeId)}: ${data?.error ?? "failed"}`);
        }
      }
      if (failures.length === 0) {
        setAddMemberOpen(false);
        setModalMemberSelection(new Set());
        router.refresh();
      } else {
        setAddMemberError(failures.slice(0, 3).join(" · ") + (failures.length > 3 ? "…" : ""));
      }
    } finally {
      setAddMemberBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!clientContactId && !clientOrgId) {
      setError("A client (contact or organization) is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || null,
          project_status_slug: statusSlug,
          project_type_slug: projectTypeSlug.trim() ? projectTypeSlug.trim().toLowerCase() : null,
          start_date: startDate || null,
          due_date: dueDate || null,
          completed_date: completedDate || null,
          estimated_hourly_rate: estimatedHourlyRate.trim()
            ? parseFloat(estimatedHourlyRate)
            : null,
          cover_image_id: coverImageId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error ?? "Failed to update project");
        return;
      }
      router.push(`/admin/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  const markProjectComplete = async () => {
    if (!completeStatusTerm) return;
    setMarkCompleteBusy(true);
    setError(null);
    try {
      const ymd = todayLocalYmd();
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_status_slug: completeStatusTerm.slug,
          completed_date: ymd,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to mark complete");
        return;
      }
      setStatusSlug(completeStatusTerm.slug);
      setCompletedDate(ymd);
      router.refresh();
    } finally {
      setMarkCompleteBusy(false);
    }
  };

  const setClientAddableOrgContacts = setClientOrgContacts.filter(
    (c) => !setClientExistingMemberContactIds.has(c.id)
  );
  const toggleSetClientOrgContact = (id: string) => {
    setSetClientSelectedOrgContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runApplySetClient = async () => {
    setSetClientBusy(true);
    try {
      if (setClientKind === "contact" && setClientSelectedContactId) {
        const putRes = await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: setClientSelectedContactId,
            client_organization_id: null,
          }),
        });
        if (!putRes.ok) return;
        const label =
          setClientContacts.find((c) => c.id === setClientSelectedContactId)?.full_name ??
          setClientContacts.find((c) => c.id === setClientSelectedContactId)?.email ??
          setClientSelectedContactId;
        setClientName(label);
        setClientContactId(setClientSelectedContactId);
        setClientOrgId(null);
        try {
          const crRes = await fetch(`/api/crm/contacts/${setClientSelectedContactId}`);
          const cr = crRes.ok
            ? ((await crRes.json().catch(() => null)) as null | {
                first_name?: string | null;
                last_name?: string | null;
                email?: string | null;
              })
            : null;
          if (cr) setClientInitials(initialsFromFirstLast(cr.first_name, cr.last_name, cr.email));
          else setClientInitials(initialsFromLabel(label));
        } catch {
          setClientInitials(initialsFromLabel(label));
        }
        const alreadyMember = projectMembers.some(
          (m) => m.contact_id === setClientSelectedContactId
        );
        if (!alreadyMember) {
          await fetch(`/api/projects/${project.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: setClientSelectedContactId, role_slug: null }),
          });
        }
        setSetClientOpen(false);
        router.refresh();
        return;
      }
      if (setClientKind === "organization" && setClientSelectedOrgId) {
        const putRes = await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: null,
            client_organization_id: setClientSelectedOrgId,
          }),
        });
        if (!putRes.ok) return;
        const orgName =
          organizations.find((o) => o.id === setClientSelectedOrgId)?.name ?? setClientSelectedOrgId;
        setClientName(orgName);
        setClientContactId(null);
        setClientOrgId(setClientSelectedOrgId);
        const toAdd = setClientAddableOrgContacts.filter((c) =>
          setClientSelectedOrgContactIds.has(c.id)
        );
        for (const c of toAdd) {
          await fetch(`/api/projects/${project.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: c.id, role_slug: null }),
          });
        }
        setSetClientOpen(false);
        router.refresh();
      }
    } finally {
      setSetClientBusy(false);
    }
  };

  const additionalMembers = projectMembers.filter(
    (m) => !(clientContactId != null && m.contact_id === clientContactId)
  );

  const removeMember = async (memberId: string) => {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId }),
    });
    if (res.ok) {
      setProjectMembers((prev) => prev.filter((m) => m.id !== memberId));
      router.refresh();
    }
  };

  const typeTermForSelect = typeTerms.find((t) => t.slug === projectTypeSlug) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit project</h1>
          <Button variant="ghost" size="sm" asChild className="mt-1 -ml-2">
            <Link href={`/admin/projects/${project.id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to project
            </Link>
          </Button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={`/admin/projects/${project.id}`}>Cancel</Link>
          </Button>
          <Button type="submit" form="project-edit-form" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <form id="project-edit-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-4">
            <div className="min-w-0 lg:col-span-6 flex flex-col gap-3">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Project ID
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
                    <Hash className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate" title={projectDisplayRef(project)}>
                      {projectDisplayRef(project)}
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="proj_title" className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Project title
                </Label>
                <Input
                  id="proj_title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-2xl font-bold h-auto py-2"
                  placeholder="Project name"
                />
              </div>
              <div>
                <Label htmlFor="proj_desc" className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="proj_desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="mt-1 text-sm"
                  placeholder="Optional description"
                />
              </div>
            </div>

            <Card variant="bento" className="task-bento-tile flex min-h-0 flex-col lg:col-span-3">
              <CardContent className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Image
                </p>
                <div className="flex min-h-[8rem] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20 px-2 py-4 text-center">
                  {coverPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverPreviewUrl}
                      alt=""
                      className="max-h-40 w-full object-contain"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
                      <p className="text-xs text-muted-foreground">No image</p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setMediaPickerOpen(true)}>
                    {coverImageId ? "Change image" : "Choose image"}
                  </Button>
                  {coverImageId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCoverImageId(null);
                        setCoverPreviewUrl(null);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card variant="bento" className="task-bento-tile flex min-h-0 flex-col lg:col-span-3">
              <CardContent className="flex flex-1 flex-col gap-3 px-3 pb-3 pt-3.5 sm:px-3.5">
                <div className="space-y-2">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </p>
                  <Select value={statusSlug} onValueChange={setStatusSlug}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusTerms.map((t) => (
                        <SelectItem key={t.slug} value={t.slug}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={t.color ? { backgroundColor: t.color } : undefined}
                            />
                            <span>{t.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  className="shrink-0 border-t border-border/60"
                  role="separator"
                  aria-hidden
                />
                <div className="space-y-2">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Project type
                  </p>
                  {typeTerms.length > 0 ? (
                    <Select
                      value={projectTypeSlug || "none"}
                      onValueChange={(v) => setProjectTypeSlug(v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {typeTerms.map((t) => (
                          <SelectItem key={t.slug} value={t.slug}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={t.color ? { backgroundColor: t.color } : undefined}
                                />
                                <span>{t.name}</span>
                              </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">No types configured.</p>
                  )}
                  {typeTermForSelect ? (
                    <p className="text-[10px] text-muted-foreground">Selected: {typeTermForSelect.name}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Schedule & labor</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="due">End date (due)</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="completed">Completed date</Label>
              <Input
                id="completed"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="mt-1"
              />
              {completeStatusTerm ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full sm:w-auto"
                  disabled={
                    markCompleteBusy || statusSlug === completeStatusTerm.slug || !!project.archived_at
                  }
                  onClick={() => void markProjectComplete()}
                >
                  <CheckCircle2 className="mr-1 size-4" aria-hidden />
                  {markCompleteBusy ? "Updating…" : "Mark complete"}
                </Button>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Project status slug <span className="font-semibold">complete</span> is not available in the current status terms.
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Sets status to Complete and today’s date. Message center post deferred.
              </p>
            </div>
            <div>
              <Label htmlFor="hourly_rate">Estimated hourly labor</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={estimatedHourlyRate}
                onChange={(e) => setEstimatedHourlyRate(e.target.value)}
                placeholder="e.g. 85"
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Used for labor estimate (logged hours × rate).
              </p>
            </div>
          </div>
        </section>

        <Card variant="bento" className="task-bento-tile">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Client & members</h2>
            <p className="text-sm text-muted-foreground">
              Set the client, then add team users and contacts from the directory.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:items-start md:gap-4">
              <div className="md:col-span-1 flex min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Client <span className="text-destructive">*</span>
                </Label>
                {clientName ? (
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                    <span
                      className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary"
                      title={clientName}
                    >
                      {clientInitials}
                    </span>
                    <p className="w-full min-w-0 text-sm font-semibold leading-tight text-foreground truncate">
                      {clientName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {clientOrgId ? "Organization" : "Contact"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground text-xs">
                      —
                    </span>
                    <p className="text-xs text-muted-foreground">Required to save</p>
                  </div>
                )}
                <Dialog
                  open={setClientOpen}
                  onOpenChange={(open) => {
                    setSetClientOpen(open);
                    if (open) {
                      if (clientOrgId) {
                        setSetClientKind("organization");
                        setSetClientSelectedOrgId(clientOrgId);
                        setSetClientSelectedContactId("");
                      } else {
                        setSetClientKind("contact");
                        setSetClientSelectedContactId(clientContactId ?? "");
                        setSetClientSelectedOrgId("");
                      }
                      setSetClientContactSearch("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="w-full">
                      {clientName ? "Change client" : "Set client"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Set project client</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 overflow-auto min-h-0">
                      <div>
                        <Label className="text-sm">Client type</Label>
                        <Select
                          value={setClientKind}
                          onValueChange={(v) => {
                            setSetClientKind(v as SetClientKind);
                            setSetClientSelectedContactId("");
                            setSetClientSelectedOrgId("");
                            setSetClientSelectedOrgContactIds(new Set());
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contact">Contact</SelectItem>
                            <SelectItem value="organization">Organization</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {setClientKind === "contact" && (
                        <div>
                          <Label className="text-sm">Contact</Label>
                          <Input
                            placeholder="Search contacts…"
                            value={setClientContactSearch}
                            onChange={(e) => setSetClientContactSearch(e.target.value)}
                            className="mt-1"
                          />
                          <Select
                            value={setClientSelectedContactId || "none"}
                            onValueChange={(v) => setSetClientSelectedContactId(v === "none" ? "" : v)}
                            disabled={setClientContactsLoading}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue
                                placeholder={setClientContactsLoading ? "Loading…" : "Select contact"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Select —</SelectItem>
                              {setClientContacts.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.full_name || c.email || c.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {setClientKind === "organization" && (
                        <div className="space-y-2">
                          <Label className="text-sm">Organization</Label>
                          <Select
                            value={setClientSelectedOrgId || "none"}
                            onValueChange={(v) => setSetClientSelectedOrgId(v === "none" ? "" : v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Select —</SelectItem>
                              {organizations.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {setClientSelectedOrgId ? (
                            <div>
                              <Label className="text-sm">Add org contacts as members (optional)</Label>
                              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                                {setClientOrgContactsLoading ? (
                                  <p className="text-sm text-muted-foreground">Loading…</p>
                                ) : setClientOrgContacts.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No contacts in this organization.
                                  </p>
                                ) : (
                                  setClientOrgContacts.map((c) => {
                                    const isExisting = setClientExistingMemberContactIds.has(c.id);
                                    const isSelected = setClientSelectedOrgContactIds.has(c.id);
                                    return (
                                      <label
                                        key={c.id}
                                        className={cn(
                                          "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                                          isExisting && "cursor-not-allowed opacity-60"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isExisting ? false : isSelected}
                                          disabled={isExisting}
                                          onCheckedChange={() =>
                                            !isExisting && toggleSetClientOrgContact(c.id)
                                          }
                                        />
                                        <span className="truncate">
                                          {c.full_name || c.email || c.id}
                                          {isExisting ? " (already member)" : ""}
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                              <div className="mt-1 flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() =>
                                    setSetClientSelectedOrgContactIds(
                                      new Set(setClientAddableOrgContacts.map((c) => c.id))
                                    )
                                  }
                                >
                                  Select all
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => setSetClientSelectedOrgContactIds(new Set())}
                                >
                                  Deselect all
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={() => void runApplySetClient()}
                        disabled={
                          setClientBusy ||
                          (setClientKind === "contact" && !setClientSelectedContactId) ||
                          (setClientKind === "organization" && !setClientSelectedOrgId)
                        }
                      >
                        {setClientBusy ? "Saving…" : "Save client"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="md:col-span-3 flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Additional members
                  </span>
                  <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" size="sm" variant="outline" onClick={openAddMembers}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add from directory
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-3">
                      <DialogHeader>
                        <DialogTitle>Add members</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Search team and contacts (same directory as tasks and events). Select one or more,
                        optional role, then Add.
                      </p>
                      {directoryLoading ? (
                        <p className="text-sm text-muted-foreground">Loading directory…</p>
                      ) : (
                        <DirectoryParticipantPicker
                          directoryRows={directoryRowsForPicker}
                          selectedCompositeIds={modalMemberSelection}
                          onSelectionChange={setModalMemberSelection}
                        />
                      )}
                      <div>
                        <Label className="text-sm">Role (optional)</Label>
                        <Select
                          value={addMemberRoleSlug || "none"}
                          onValueChange={(v) => setAddMemberRoleSlug(v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {projectRoleTerms.map((t) => (
                              <SelectItem key={t.slug} value={t.slug}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {addMemberError ? (
                        <p className="text-sm text-destructive">{addMemberError}</p>
                      ) : null}
                      <Button
                        type="button"
                        disabled={
                          addMemberBusy || modalMemberSelection.size === 0 || directoryLoading
                        }
                        onClick={() => void runAddDirectoryMembers()}
                      >
                        {addMemberBusy ? "Adding…" : `Add${modalMemberSelection.size ? ` (${modalMemberSelection.size})` : ""}`}
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-wrap gap-2">
                  {additionalMembers.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No additional members yet.</span>
                  ) : (
                    additionalMembers.map((m) => (
                      <div
                        key={m.id}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-0.5 pl-1 pr-2 text-sm"
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary"
                          title={m.label}
                        >
                          {m.avatar_initials}
                        </span>
                        <span className="max-w-[180px] truncate">{m.label}</span>
                        {m.role_label ? (
                          <span className="text-xs text-muted-foreground">({m.role_label})</span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => removeMember(m.id)}
                          aria-label="Remove member"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </form>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={async (mediaId) => {
          setCoverImageId(mediaId);
          try {
            const r = await fetch(`/api/media/${mediaId}/thumbnail`);
            const data = (await r.json()) as { thumbnailUrl?: string | null };
            setCoverPreviewUrl(
              typeof data.thumbnailUrl === "string" && data.thumbnailUrl ? data.thumbnailUrl : null
            );
          } catch {
            setCoverPreviewUrl(null);
          }
        }}
      />
    </div>
  );
}
