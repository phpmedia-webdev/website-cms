"use client";

import { useState, useCallback } from "react";
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

interface TaskFollowersSectionProps {
  taskId: string;
  initialFollowers: TaskFollowerWithLabel[];
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
}: TaskFollowersSectionProps) {
  const [followers, setFollowers] = useState<TaskFollowerWithLabel[]>(initialFollowers);
  const [role, setRole] = useState<"creator" | "responsible" | "follower">("follower");
  const [contactSearch, setContactSearch] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          Add a contact (e.g. member) as follower so the task thread can receive replies.
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
          <Label>Add follower (contact)</Label>
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
          </div>
          {contactSearching && (
            <p className="text-xs text-muted-foreground">Searching…</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
