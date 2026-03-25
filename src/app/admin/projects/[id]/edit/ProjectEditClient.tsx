"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, UserPlus, X } from "lucide-react";
import type { Project, ProjectMember } from "@/lib/supabase/projects";
import type { StatusOrTypeTerm } from "@/lib/supabase/projects";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ProjectEditClientProps {
  project: Project;
  statusTerms: StatusOrTypeTerm[];
  typeTerms: StatusOrTypeTerm[];
  projectRoleTerms: StatusOrTypeTerm[];
  clientDisplayName: string | null;
  initialProjectMembers: (ProjectMember & { label: string; role_label: string | null })[];
}

type AddMemberType = "team" | "contact";
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

interface TeamUserOption {
  user_id: string;
  display_name: string | null;
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

export function ProjectEditClient({
  project,
  statusTerms,
  typeTerms,
  projectRoleTerms,
  clientDisplayName,
  initialProjectMembers,
}: ProjectEditClientProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [statusTermId, setStatusTermId] = useState(project.status_term_id);
  const [projectTypeTermId, setProjectTypeTermId] = useState(
    project.project_type_term_id ?? ""
  );
  const [startDate, setStartDate] = useState(toInputDate(project.start_date));
  const [dueDate, setDueDate] = useState(toInputDate(project.due_date));
  const [completedDate, setCompletedDate] = useState(toInputDate(project.completed_date));
  const [potentialSales, setPotentialSales] = useState(
    project.potential_sales != null ? String(project.potential_sales) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState(initialProjectMembers);
  const [clientName, setClientName] = useState(clientDisplayName);
  const [clientContactId, setClientContactId] = useState<string | null>(project.contact_id);
  const [clientOrgId, setClientOrgId] = useState<string | null>(project.client_organization_id);

  useEffect(() => {
    setProjectMembers(initialProjectMembers);
    setClientName(clientDisplayName);
    setClientContactId(project.contact_id);
    setClientOrgId(project.client_organization_id);
  }, [initialProjectMembers, clientDisplayName, project.contact_id, project.client_organization_id]);

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
  const [addMemberType, setAddMemberType] = useState<AddMemberType>("team");
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addMemberRoleTermId, setAddMemberRoleTermId] = useState("");
  const [addMemberBusy, setAddMemberBusy] = useState(false);

  useEffect(() => {
    if (!addMemberOpen && !setClientOpen) return;
    fetch("/api/crm/organizations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.organizations)) {
          setOrganizations(data.organizations.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })));
        }
      })
      .catch(() => {});
    if (addMemberOpen) {
      fetch("/api/settings/team")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.users)) {
            setTeamUsers(
              data.users.map((u: { user_id: string; display_name: string | null }) => ({
                user_id: u.user_id,
                display_name: u.display_name ?? null,
              }))
            );
          } else setTeamUsers([]);
        })
        .catch(() => setTeamUsers([]));
    }
  }, [addMemberOpen, setClientOpen]);

  useEffect(() => {
    if (!addMemberOpen || addMemberType !== "contact") return;
    setContactsLoading(true);
    const q = contactSearch.trim() || " ";
    fetch(`/api/crm/contacts/search?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(
          Array.isArray(data.contacts)
            ? data.contacts.map((c: { id: string; full_name: string | null; email: string | null }) => ({
                id: c.id,
                full_name: c.full_name ?? null,
                email: c.email ?? null,
              }))
            : []
        );
      })
      .catch(() => setContacts([]))
      .finally(() => setContactsLoading(false));
  }, [addMemberOpen, addMemberType, contactSearch]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!clientContactId && !clientOrgId) {
      setError("A client (contact or organization) is required. Set the client in the Members section below.");
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
          status_term_id: statusTermId,
          project_type_term_id: projectTypeTermId || null,
          start_date: startDate || null,
          due_date: dueDate || null,
          completed_date: completedDate || null,
          potential_sales: potentialSales ? parseFloat(potentialSales) : null,
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
        const alreadyMember = projectMembers.some(
          (m) => m.contact_id === setClientSelectedContactId
        );
        if (!alreadyMember) {
          await fetch(`/api/projects/${project.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: setClientSelectedContactId, role_term_id: null }),
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
            body: JSON.stringify({ contact_id: c.id, role_term_id: null }),
          });
        }
        setSetClientOpen(false);
        router.refresh();
      }
    } finally {
      setSetClientBusy(false);
    }
  };

  const runAddMember = async () => {
    setAddMemberBusy(true);
    try {
      if (addMemberType === "team" && selectedUserId) {
        const res = await fetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: selectedUserId, role_term_id: addMemberRoleTermId || null }),
        });
        if (res.ok) {
          setAddMemberOpen(false);
          router.refresh();
        }
        return;
      }
      if (addMemberType === "contact" && selectedContactId) {
        const res = await fetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_id: selectedContactId, role_term_id: addMemberRoleTermId || null }),
        });
        if (res.ok) {
          setAddMemberOpen(false);
          router.refresh();
        }
      }
    } finally {
      setAddMemberBusy(false);
    }
  };

  const additionalMembers = projectMembers.filter(
    (m) => !(clientContactId != null && m.contact_id === clientContactId)
  );

  function initials(label: string): string {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    return label.slice(0, 2).toUpperCase() || "?";
  }

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page chrome — match task edit (`TaskEditClient`): outside form card */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Project Detail</h1>
        <Button variant="ghost" size="sm" asChild className="mt-1 -ml-2">
          <Link href={`/admin/projects/${project.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to project
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Edit project</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusTermId} onValueChange={setStatusTermId}>
                <SelectTrigger id="status" className="mt-1 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusTerms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {typeTerms.length > 0 && (
              <div>
                <Label htmlFor="project_type">Type</Label>
                <Select value={projectTypeTermId || "none"} onValueChange={(v) => setProjectTypeTermId(v === "none" ? "" : v)}>
                  <SelectTrigger id="project_type" className="mt-1 w-[140px]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {typeTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <Label htmlFor="due">Due date</Label>
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
              </div>
            </div>
            <div>
              <Label htmlFor="sales">Potential sales</Label>
              <Input
                id="sales"
                type="number"
                step="0.01"
                min="0"
                value={potentialSales}
                onChange={(e) => setPotentialSales(e.target.value)}
                placeholder="0"
                className="mt-1 w-40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categories & tags</Label>
              <TaxonomyAssignmentForContent
                contentId={project.id}
                contentTypeSlug="project"
                section="project"
                sectionLabel="Projects"
                compact
                onSaved={() => router.refresh()}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/admin/projects/${project.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-medium">Client & members</h2>
          <p className="text-sm text-muted-foreground">
            Set one client (contact or organization), then add team users or other contacts as additional members.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4 md:items-start md:gap-4">
            <div className="md:col-span-1 flex min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Client <span className="text-destructive">*</span>
                </Label>
              </div>
              {clientName ? (
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span
                    className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary"
                    title={clientName}
                  >
                    {initials(clientName)}
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
                  <p className="text-xs text-muted-foreground">Required to save the project</p>
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
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Additional members
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Team users and contacts (client contact is managed in the left column).
                  </p>
                </div>
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Add project member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 overflow-auto min-h-0">
                      <div>
                        <Label className="text-sm">Add as</Label>
                        <Select
                          value={addMemberType}
                          onValueChange={(v) => {
                            setAddMemberType(v as AddMemberType);
                            setSelectedContactId("");
                            setSelectedUserId("");
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team">Team member</SelectItem>
                            <SelectItem value="contact">Contact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Role (optional)</Label>
                        <Select
                          value={addMemberRoleTermId || "none"}
                          onValueChange={(v) => setAddMemberRoleTermId(v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {projectRoleTerms.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {addMemberType === "contact" && (
                        <div>
                          <Label className="text-sm">Contact</Label>
                          <Input
                            placeholder="Search contacts…"
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            className="mt-1"
                          />
                          <Select
                            value={selectedContactId || "none"}
                            onValueChange={(v) => setSelectedContactId(v === "none" ? "" : v)}
                            disabled={contactsLoading}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder={contactsLoading ? "Loading…" : "Select contact"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Select —</SelectItem>
                              {contacts.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.full_name || c.email || c.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {addMemberType === "team" && (
                        <div>
                          <Label className="text-sm">Team member</Label>
                          <Select
                            value={selectedUserId || "none"}
                            onValueChange={(v) => setSelectedUserId(v === "none" ? "" : v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Select —</SelectItem>
                              {teamUsers.map((u) => (
                                <SelectItem key={u.user_id} value={u.user_id}>
                                  {u.display_name || u.user_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={() => void runAddMember()}
                        disabled={
                          addMemberBusy ||
                          (addMemberType === "team" && !selectedUserId) ||
                          (addMemberType === "contact" && !selectedContactId)
                        }
                      >
                        {addMemberBusy ? "Adding…" : "Add"}
                      </Button>
                    </div>
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
                        {initials(m.label)}
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
    </div>
  );
}
