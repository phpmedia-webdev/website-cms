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
import { DurationPicker } from "@/components/ui/duration-picker";
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

type AddMemberType = "client_contact" | "client_org" | "team" | "contact";

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
  const [proposedStartDate, setProposedStartDate] = useState(toInputDate(project.proposed_start_date));
  const [proposedEndDate, setProposedEndDate] = useState(toInputDate(project.proposed_end_date));
  const [proposedTimeMinutes, setProposedTimeMinutes] = useState<number | null>(
    project.proposed_time ?? null
  );
  const [potentialSales, setPotentialSales] = useState(
    project.potential_sales != null ? String(project.potential_sales) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState(initialProjectMembers);
  const [clientName, setClientName] = useState(clientDisplayName);

  useEffect(() => {
    setProjectMembers(initialProjectMembers);
    setClientName(clientDisplayName);
  }, [initialProjectMembers, clientDisplayName]);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberType, setAddMemberType] = useState<AddMemberType>("contact");
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [teamUsers, setTeamUsers] = useState<TeamUserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addMemberRoleTermId, setAddMemberRoleTermId] = useState("");
  const [orgContacts, setOrgContacts] = useState<ContactOption[]>([]);
  const [existingMemberContactIds, setExistingMemberContactIds] = useState<Set<string>>(new Set());
  const [selectedOrgContactIds, setSelectedOrgContactIds] = useState<Set<string>>(new Set());
  const [addMemberBusy, setAddMemberBusy] = useState(false);
  const [orgContactsLoading, setOrgContactsLoading] = useState(false);

  useEffect(() => {
    if (!addMemberOpen) return;
    fetch("/api/crm/organizations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.organizations)) {
          setOrganizations(data.organizations.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })));
        }
      })
      .catch(() => {});
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
  }, [addMemberOpen]);

  useEffect(() => {
    if (addMemberType !== "contact" && addMemberType !== "client_contact") return;
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
    if (addMemberType !== "client_org" || !selectedOrgId) return;
    setOrgContactsLoading(true);
    Promise.all([
      fetch(`/api/crm/organizations/${selectedOrgId}/contacts`).then((r) => r.json()),
      fetch(`/api/projects/${project.id}/members`).then((r) => r.json()),
    ])
      .then(([contactsRes, membersRes]) => {
        const list = Array.isArray(contactsRes.contacts) ? contactsRes.contacts : [];
        setOrgContacts(
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
        setExistingMemberContactIds(contactIds);
        setSelectedOrgContactIds(
          new Set(list.map((c: { id: string }) => c.id).filter((id: string) => !contactIds.has(id)))
        );
      })
      .catch(() => {
        setOrgContacts([]);
        setExistingMemberContactIds(new Set());
        setSelectedOrgContactIds(new Set());
      })
      .finally(() => setOrgContactsLoading(false));
  }, [addMemberType, selectedOrgId, project.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
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
          proposed_start_date: proposedStartDate || null,
          proposed_end_date: proposedEndDate || null,
          proposed_time: proposedTimeMinutes ?? null,
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

  const clearClient = async () => {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: null, client_organization_id: null }),
    });
    if (res.ok) {
      setClientName(null);
      router.refresh();
    }
  };

  const addableOrgContacts = orgContacts.filter((c) => !existingMemberContactIds.has(c.id));
  const toggleOrgContact = (id: string) => {
    setSelectedOrgContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runAddMember = async () => {
    setAddMemberBusy(true);
    try {
      if (addMemberType === "client_contact" && selectedContactId) {
        await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_id: selectedContactId, client_organization_id: null }),
        });
        await fetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_id: selectedContactId, role_term_id: addMemberRoleTermId || null }),
        });
        setClientName(contacts.find((c) => c.id === selectedContactId)?.full_name ?? selectedContactId);
        setAddMemberOpen(false);
        router.refresh();
        return;
      }
      if (addMemberType === "client_org" && selectedOrgId) {
        await fetch(`/api/projects/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_id: null, client_organization_id: selectedOrgId }),
        });
        setClientName(organizations.find((o) => o.id === selectedOrgId)?.name ?? selectedOrgId);
        const toAdd = addableOrgContacts.filter((c) => selectedOrgContactIds.has(c.id));
        for (const c of toAdd) {
          await fetch(`/api/projects/${project.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: c.id, role_term_id: addMemberRoleTermId || null }),
          });
        }
        setAddMemberOpen(false);
        router.refresh();
        return;
      }
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
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/projects/${project.id}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to project
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Edit project</h1>
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
            <DurationPicker
              value={proposedTimeMinutes}
              onValueChange={setProposedTimeMinutes}
              id="proposed_time"
              label="Estimated time"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Proposed start date</Label>
                <Input
                  id="start"
                  type="date"
                  value={proposedStartDate}
                  onChange={(e) => setProposedStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end">Proposed end date</Label>
                <Input
                  id="end"
                  type="date"
                  value={proposedEndDate}
                  onChange={(e) => setProposedEndDate(e.target.value)}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Members</h2>
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
                        setSelectedOrgId("");
                        setSelectedUserId("");
                        setSelectedOrgContactIds(new Set());
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_contact">Client (Contact)</SelectItem>
                        <SelectItem value="client_org">Client (Organization)</SelectItem>
                        <SelectItem value="team">Team member</SelectItem>
                        <SelectItem value="contact">Contact (member only)</SelectItem>
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

                  {(addMemberType === "client_contact" || addMemberType === "contact") && (
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

                  {addMemberType === "client_org" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Organization</Label>
                      <Select value={selectedOrgId || "none"} onValueChange={(v) => setSelectedOrgId(v === "none" ? "" : v)}>
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
                      {selectedOrgId && (
                        <div>
                          <Label className="text-sm">Add org contacts as members (optional)</Label>
                          <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto mt-1">
                            {orgContactsLoading ? (
                              <p className="text-sm text-muted-foreground">Loading…</p>
                            ) : orgContacts.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No contacts in this organization.</p>
                            ) : (
                              orgContacts.map((c) => {
                                const isExisting = existingMemberContactIds.has(c.id);
                                const isSelected = selectedOrgContactIds.has(c.id);
                                return (
                                  <label
                                    key={c.id}
                                    className={cn(
                                      "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm",
                                      isExisting && "opacity-60 cursor-not-allowed"
                                    )}
                                  >
                                    <Checkbox
                                      checked={isExisting ? false : isSelected}
                                      disabled={isExisting}
                                      onCheckedChange={() => !isExisting && toggleOrgContact(c.id)}
                                    />
                                    <span className="truncate">
                                      {c.full_name || c.email || c.id}
                                      {isExisting && " (already member)"}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedOrgContactIds(new Set(addableOrgContacts.map((c) => c.id)))}>
                              Select all
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedOrgContactIds(new Set())}>
                              Deselect all
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {addMemberType === "team" && (
                    <div>
                      <Label className="text-sm">Team member</Label>
                      <Select value={selectedUserId || "none"} onValueChange={(v) => setSelectedUserId(v === "none" ? "" : v)}>
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
                    onClick={runAddMember}
                    disabled={
                      addMemberBusy ||
                      (addMemberType === "client_contact" && !selectedContactId) ||
                      (addMemberType === "client_org" && !selectedOrgId) ||
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
        </CardHeader>
        <CardContent className="space-y-3">
          {clientName != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span>{clientName}</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearClient}>
                Clear
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {projectMembers.length === 0 ? (
              <span className="text-sm text-muted-foreground">No members yet.</span>
            ) : (
              projectMembers.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 pl-1 pr-2 py-0.5 text-sm"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary"
                    title={m.label}
                  >
                    {initials(m.label)}
                  </span>
                  <span className="truncate max-w-[120px]">{m.label}</span>
                  {m.role_label && <span className="text-muted-foreground text-xs">({m.role_label})</span>}
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
        </CardContent>
      </Card>
    </div>
  );
}
