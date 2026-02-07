"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Search } from "lucide-react";
import type { Mag } from "@/lib/supabase/crm";

/** Slugify for UID: lowercase, hyphens, no leading/trailing hyphens. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface MembershipsListClientProps {
  mags: Mag[];
  membershipEnabled: boolean;
  magCount: number;
}

export function MembershipsListClient({ mags, membershipEnabled: initialMembershipEnabled, magCount: initialMagCount }: MembershipsListClientProps) {
  const router = useRouter();
  const [membershipEnabled, setMembershipEnabled] = useState(initialMembershipEnabled);
  const [magCount, setMagCount] = useState(initialMagCount);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [turnOffConfirmOpen, setTurnOffConfirmOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setMembershipEnabled(initialMembershipEnabled);
    setMagCount(initialMagCount);
  }, [initialMembershipEnabled, initialMagCount]);

  const handleToggleChange = async (enabled: boolean) => {
    if (enabled === false && magCount > 0) {
      setTurnOffConfirmOpen(true);
      return;
    }
    await patchMembershipEnabled(enabled);
  };

  const handleTurnOffConfirm = async () => {
    setTurnOffConfirmOpen(false);
    await patchMembershipEnabled(false);
  };

  const patchMembershipEnabled = async (enabled: boolean) => {
    setToggleSaving(true);
    try {
      const res = await fetch("/api/crm/memberships/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_enabled: enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMembershipEnabled(data.membership_enabled ?? enabled);
        setMagCount(data.mag_count ?? magCount);
        router.refresh();
      } else {
        alert(data.error ?? "Failed to update");
      }
    } finally {
      setToggleSaving(false);
    }
  };
  const [uid, setUid] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [search, setSearch] = useState("");

  const searchLower = search.trim().toLowerCase();
  const filteredMags = searchLower
    ? mags.filter((mag) => {
        const tag = `mag-${mag.uid}`;
        return (
          mag.name.toLowerCase().includes(searchLower) ||
          mag.uid.toLowerCase().includes(searchLower) ||
          tag.includes(searchLower)
        );
      })
    : mags;

  const suggestFromName = useCallback((newName: string) => {
    const suggested = slugify(newName);
    setUid((prev) => (prev === "" || prev === slugify(name) ? suggested : prev));
  }, [name]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setName(v);
    suggestFromName(v);
  };

  const magTag = uid ? `mag-${uid}` : "";

  const resetForm = () => {
    setName("");
    setUid("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStatus("active");
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !uid.trim()) {
      alert("Name and UID are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/mags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          uid: uid.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to create membership");
        return;
      }
      const created = await res.json();
      closeModal();
      router.refresh();
      router.push(`/admin/crm/memberships/${created.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-row items-center justify-between gap-4 py-4">
          <div>
            <p className="font-medium">Membership</p>
            <p className="text-sm text-muted-foreground">
              {membershipEnabled
                ? "Sync and content protection are on. You can create and manage membership groups."
                : "Turn on Membership before creating any MAGs. While off, no sync runs and all content is public."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {toggleSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="membership-master"
              checked={membershipEnabled}
              onCheckedChange={(checked) => handleToggleChange(checked === true)}
              disabled={toggleSaving}
            />
            <Label htmlFor="membership-master" className="text-sm cursor-pointer">
              {membershipEnabled ? "On" : "Off"}
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Memberships</h1>
        <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search memberships..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            aria-label="Search memberships by name, UID, or MAG-TAG"
          />
        </div>
        <Button onClick={openModal} className="shrink-0" disabled={!membershipEnabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {mags.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No memberships yet. Create one to assign contacts to membership groups.
            </div>
          ) : filteredMags.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No memberships match your search.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">MAG-TAG</th>
                  <th className="text-left p-3 font-medium">Start Date</th>
                  <th className="text-left p-3 font-medium">End Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMags.map((mag) => (
                  <tr
                    key={mag.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3">
                      <Link
                        href={`/admin/crm/memberships/${mag.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {mag.name}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-sm text-muted-foreground">
                      mag-{mag.uid}
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {mag.start_date
                        ? new Date(mag.start_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {mag.end_date
                        ? new Date(mag.end_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={mag.status === "active" ? "default" : "secondary"}
                      >
                        {mag.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={turnOffConfirmOpen} onOpenChange={setTurnOffConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off Membership?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {magCount} membership group{magCount !== 1 ? "s" : ""} exist{magCount === 1 ? "s" : ""}. Gated content may be exposed when Membership is off. Consider making memberships inactive (draft) first. Turn off anyway?
          </p>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setTurnOffConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleTurnOffConfirm}>Turn off</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New membership</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="modal-name">Name *</Label>
                <Input
                  id="modal-name"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Premium Video"
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground leading-tight">
                  Display name for this membership.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-uid">UID (for code) *</Label>
                <Input
                  id="modal-uid"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  className="font-mono w-full"
                  placeholder="Auto-suggested from name"
                  required
                />
                <p className="text-xs text-muted-foreground leading-tight">
                  Used in code and APIs to identify this membership.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-mag-tag">MAG-TAG (for media)</Label>
                <Input
                  id="modal-mag-tag"
                  value={magTag}
                  readOnly
                  className="font-mono bg-muted w-full"
                />
                <p className="text-xs text-muted-foreground leading-tight">
                  Tag to apply to media to restrict by this membership (mag- + UID).
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-description">Description</Label>
              <Input
                id="modal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-start_date">Start date</Label>
                <Input
                  id="modal-start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-end_date">End date (empty = no end)</Label>
                <Input
                  id="modal-end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "draft")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft (hidden from users)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex justify-end gap-2 sm:justify-end pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create membership
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
