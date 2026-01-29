"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function MembershipsListClient({ mags }: MembershipsListClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
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
        <Button onClick={openModal} className="shrink-0">
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
