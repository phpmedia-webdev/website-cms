"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, Trash2, Search } from "lucide-react";
import type { Mag } from "@/lib/supabase/crm";
import type { ContactInMag } from "@/lib/supabase/crm";

interface MAGDetailClientProps {
  mag: Mag;
  initialContacts: ContactInMag[];
}

export function MAGDetailClient({ mag, initialContacts }: MAGDetailClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(mag.name);
  const [uid, setUid] = useState(mag.uid);
  const [description, setDescription] = useState(mag.description ?? "");
  const [startDate, setStartDate] = useState(
    mag.start_date ? mag.start_date.slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    mag.end_date ? mag.end_date.slice(0, 10) : ""
  );
  const [status, setStatus] = useState<"active" | "draft">(mag.status);
  const [magTag, setMagTag] = useState(`mag-${mag.uid}`);
  const [contacts, setContacts] = useState(initialContacts);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  useEffect(() => {
    setName(mag.name);
    setUid(mag.uid);
    setMagTag(`mag-${mag.uid}`);
    setDescription(mag.description ?? "");
    setStartDate(mag.start_date ? mag.start_date.slice(0, 10) : "");
    setEndDate(mag.end_date ? mag.end_date.slice(0, 10) : "");
    setStatus(mag.status);
  }, [mag]);

  const handleUidChange = (value: string) => {
    setUid(value);
    setMagTag(value ? `mag-${value}` : "mag-");
  };

  const handleMagTagChange = (value: string) => {
    setMagTag(value);
    const stripped = value.startsWith("mag-") ? value.slice(4) : value;
    setUid(stripped);
  };

  const [assignOpen, setAssignOpen] = useState(false);
  const [uidChangeWarningOpen, setUidChangeWarningOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [allContacts, setAllContacts] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [assigning, setAssigning] = useState(false);

  const performSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/mags/${mag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          uid,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to update");
        return;
      }
      setUidChangeWarningOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const uidChanged = uid !== mag.uid;
    const tagChanged = magTag !== `mag-${mag.uid}`;
    if (uidChanged || tagChanged) {
      setUidChangeWarningOpen(true);
      return;
    }
    await performSave();
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mag_id: mag.id }),
      });
      if (!res.ok) return;
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      router.refresh();
    } catch {
      // ignore
    }
  };

  const openAssignDialog = async () => {
    setAssignOpen(true);
    if (allContacts.length === 0) {
      const res = await fetch("/api/crm/contacts");
      if (res.ok) {
        const data = await res.json();
        setAllContacts(data.map((c: { id: string; full_name: string | null; email: string | null }) => ({ id: c.id, full_name: c.full_name, email: c.email })));
      }
    }
  };

  const filteredContacts = contactSearch.trim()
    ? allContacts.filter((c) => {
        const q = contactSearch.toLowerCase();
        const name = (c.full_name ?? "").toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
    : allContacts;

  const alreadyAssignedIds = new Set(contacts.map((c) => c.id));
  const assignableContacts = filteredContacts.filter((c) => !alreadyAssignedIds.has(c.id));

  const memberSearchLower = memberSearch.trim().toLowerCase();
  const displayedContacts = memberSearchLower
    ? contacts.filter((c) => {
        const first = (c.first_name ?? "").toLowerCase();
        const last = (c.last_name ?? "").toLowerCase();
        const full = (c.full_name ?? "").toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        return (
          first.includes(memberSearchLower) ||
          last.includes(memberSearchLower) ||
          full.includes(memberSearchLower) ||
          email.includes(memberSearchLower)
        );
      })
    : contacts;

  const handleAssign = async (contactId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/mags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mag_id: mag.id, assigned_via: "admin" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to assign");
        return;
      }
      setAssignOpen(false);
      setContactSearch("");
      router.refresh();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-2 sm:p-3 pb-0">
          <CardTitle className="text-base">Membership details</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 pt-1.5 space-y-2">
          <div className="space-y-1.5">
            <div className="space-y-0.5">
              <Label htmlFor="name" className="text-xs">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 w-full text-sm"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">Display name.</p>
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="uid" className="text-xs">UID (for code) *</Label>
              <Input
                id="uid"
                value={uid}
                onChange={(e) => handleUidChange(e.target.value)}
                className="h-8 font-mono w-full text-sm"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">Code/API identifier.</p>
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="mag-tag" className="text-xs">MAG-TAG (for media)</Label>
              <Input
                id="mag-tag"
                value={magTag}
                onChange={(e) => handleMagTagChange(e.target.value)}
                className="h-8 font-mono w-full text-sm"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">Tag for media restriction (mag- + UID).</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="space-y-0.5 md:col-span-2">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="start_date" className="text-xs">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="end_date" className="text-xs">End date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "draft")}>
              <SelectTrigger className="h-8 w-[7.5rem] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button size="sm" className="h-8" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 p-2 sm:p-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base shrink-0">Contacts in this membership</CardTitle>
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-8 flex-1 min-w-0 text-sm"
              aria-label="Search contacts in this membership"
            />
          </div>
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={openAssignDialog} className="h-8 shrink-0">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Assign contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign contact to this membership</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Input
                  placeholder="Search by name or email..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                  {assignableContacts.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2">
                      No contacts found or all are already assigned.
                    </p>
                  ) : (
                    assignableContacts.slice(0, 50).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-muted flex justify-between items-center"
                        onClick={() => handleAssign(c.id)}
                        disabled={assigning}
                      >
                        <span>
                          {c.full_name || c.email || c.id.slice(0, 8)}
                          {c.email ? ` (${c.email})` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={uidChangeWarningOpen} onOpenChange={setUidChangeWarningOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>UID or MAG-TAG changed</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Changing the UID or MAG-TAG will create a new taxonomy tag. Existing relations will not be updated automatically.
                </p>
                <p>
                  <strong>You will need to manually update</strong> any media or content that currently uses the old tag (e.g. in Media Library → edit item → Taxonomy). References to the old tag will become unsynced.
                </p>
                <p>
                  Continue to save with the new UID/TAG?
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setUidChangeWarningOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => performSave()} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Continue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 pt-0">
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-2">No contacts assigned yet.</p>
          ) : displayedContacts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-2">No contacts match your search.</p>
          ) : (
            <div className="max-h-[min(50vh,24rem)] overflow-y-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                  <tr className="border-b">
                    <th className="text-left px-2 py-1.5 font-medium">Name</th>
                    <th className="text-left px-2 py-1.5 font-medium">Email</th>
                    <th className="text-left px-2 py-1.5 font-medium">Status</th>
                    <th className="w-9" />
                  </tr>
                </thead>
                <tbody>
                  {displayedContacts.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-2 py-1.5">
                        <Link
                          href={`/admin/crm/contacts/${c.id}`}
                          className="text-primary hover:underline"
                        >
                          {c.full_name || c.first_name || c.last_name || "—"}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {c.email ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemoveContact(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
