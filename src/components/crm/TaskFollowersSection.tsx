"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

export interface TaskFollowerWithLabel {
  id: string;
  role: string;
  contact_id: string | null;
  user_id: string | null;
  label: string;
}

/** Project member with label (from GET .../members?with_labels=1). */
interface ProjectMemberWithLabel {
  id: string;
  project_id: string;
  user_id: string | null;
  contact_id: string | null;
  role_term_id: string | null;
  created_at: string;
  label: string;
  role_label: string | null;
}

interface TaskFollowersSectionProps {
  taskId: string;
  initialFollowers: TaskFollowerWithLabel[];
  /** When set, restrict "Add follower" to this project's members (team + contacts). */
  projectId?: string | null;
}

const ROLE_OPTIONS = [
  { value: "follower", label: "Follower" },
  { value: "responsible", label: "Responsible" },
  { value: "creator", label: "Creator" },
] as const;

/** Contact search result from API. */
interface ContactOption {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

function contactLabel(c: ContactOption): string {
  if (c.full_name?.trim()) return c.full_name.trim();
  const first = c.first_name?.trim() ?? "";
  const last = c.last_name?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ");
  if (name) return name;
  return c.email ?? "Contact";
}

/**
 * Task followers: list assignees (creator/responsible/follower) and add contact as follower.
 * Needed so task thread "Add reply" has a contact_id (from task_followers).
 */
export function TaskFollowersSection({
  taskId,
  initialFollowers,
  projectId,
}: TaskFollowersSectionProps) {
  const [followers, setFollowers] = useState<TaskFollowerWithLabel[]>(initialFollowers);
  const [role, setRole] = useState<"creator" | "responsible" | "follower">("follower");
  const [contactSearch, setContactSearch] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberWithLabel[]>([]);
  const [projectMembersLoading, setProjectMembersLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  useEffect(() => {
    if (!projectId) return;
    setProjectMembersLoading(true);
    fetch(`/api/projects/${projectId}/members?with_labels=1`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .then(setProjectMembers)
      .catch(() => setProjectMembers([]))
      .finally(() => setProjectMembersLoading(false));
  }, [projectId]);

  const searchContacts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setContactOptions([]);
      return;
    }
    setContactSearching(true);
    try {
      const res = await fetch(
        `/api/crm/contacts/search?q=${encodeURIComponent(q.trim())}&limit=15`
      );
      const data = await res.json();
      if (!res.ok) {
        setContactOptions([]);
        return;
      }
      setContactOptions(data.contacts ?? []);
    } catch {
      setContactOptions([]);
    } finally {
      setContactSearching(false);
    }
  }, []);

  const handleAddContact = async (contactId: string) => {
    setError(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/followers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, contact_id: contactId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add follower");
        return;
      }
      const contact = contactOptions.find((c) => c.id === contactId);
      const label = contact ? contactLabel(contact) : "Contact";
      setFollowers((prev) => [
        ...prev,
        { id: data.id, role, contact_id: contactId, user_id: null, label },
      ]);
      setContactSearch("");
      setContactOptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add follower");
    } finally {
      setAdding(false);
    }
  };

  const handleAddProjectMember = async (member: ProjectMemberWithLabel) => {
    setError(null);
    setAdding(true);
    try {
      const body = member.user_id
        ? { role, user_id: member.user_id }
        : { role, contact_id: member.contact_id };
      const res = await fetch(`/api/tasks/${taskId}/followers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add follower");
        return;
      }
      setFollowers((prev) => [
        ...prev,
        { id: data.id, role, contact_id: member.contact_id, user_id: member.user_id, label: member.label },
      ]);
      setSelectedMemberId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add follower");
    } finally {
      setAdding(false);
    }
  };

  const followerUserIds = new Set(followers.map((f) => f.user_id).filter(Boolean));
  const followerContactIds = new Set(followers.map((f) => f.contact_id).filter(Boolean));
  const addableProjectMembers = projectMembers.filter(
    (m) =>
      (m.user_id != null && !followerUserIds.has(m.user_id)) ||
      (m.contact_id != null && !followerContactIds.has(m.contact_id))
  );

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Assignments</h2>
        <p className="text-sm text-muted-foreground">
          {projectId
            ? "Add a project member (team or contact) as follower. Assignments are scoped to this project's members."
            : "Add a contact as follower so the task thread can receive replies."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No followers yet. Add one below.</p>
        ) : (
          <ul className="space-y-2">
            {followers.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium capitalize">{f.role}</span>
                  <span className="text-muted-foreground"> — {f.label}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(f.id)}
                  aria-label="Remove follower"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t pt-4">
          <Label>{projectId ? "Add follower (project member)" : "Add follower (contact)"}</Label>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "creator" | "responsible" | "follower")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projectId ? (
              <>
                <Select
                  value={selectedMemberId || "none"}
                  onValueChange={(v) => setSelectedMemberId(v === "none" ? "" : v)}
                  disabled={projectMembersLoading || adding}
                >
                  <SelectTrigger className="min-w-[200px]">
                    <SelectValue placeholder={projectMembersLoading ? "Loading…" : "Select project member"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Select —</SelectItem>
                    {addableProjectMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                        {m.role_label ? ` (${m.role_label})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    const member = projectMembers.find((m) => m.id === selectedMemberId);
                    if (member) handleAddProjectMember(member);
                  }}
                  disabled={!selectedMemberId || adding}
                >
                  {adding ? "Adding…" : "Add"}
                </Button>
              </>
            ) : (
              <div className="relative flex-1 min-w-[200px]">
                <Input
                  placeholder="Search contacts by name or email…"
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    searchContacts(e.target.value);
                  }}
                  onFocus={() => contactSearch && searchContacts(contactSearch)}
                  disabled={adding}
                />
                {contactOptions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md">
                    {contactOptions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleAddContact(c.id)}
                          disabled={adding}
                        >
                          {contactLabel(c)}
                          {c.email && (
                            <span className="ml-2 text-muted-foreground">{c.email}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {!projectId && contactSearching && (
            <p className="text-xs text-muted-foreground">Searching…</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
