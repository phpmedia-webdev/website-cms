"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Plus, Loader2, Search, Info, ChevronLeft, ChevronRight } from "lucide-react";
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

/** Build list in tree order (roots first, then children alpha), with depth for indentation. */
function magsWithDepth(mags: Mag[]): { mag: Mag; depth: number }[] {
  const byParent = new Map<string | null, Mag[]>();
  for (const m of mags) {
    const key = m.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }
  const sorted = (list: Mag[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const out: { mag: Mag; depth: number }[] = [];
  function addLevel(parentKey: string | null, depth: number) {
    const children = sorted(byParent.get(parentKey) ?? []);
    for (const mag of children) {
      out.push({ mag, depth });
      addLevel(mag.id, depth + 1);
    }
  }
  addLevel(null, 0);
  return out;
}

interface MembershipsListClientProps {
  mags: Mag[];
  membershipEnabled: boolean;
  magCount: number;
}

export function MembershipsListClient({ mags, membershipEnabled, magCount: _magCount }: MembershipsListClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [uid, setUid] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [parentId, setParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const searchLower = search.trim().toLowerCase();
  const orderedWithDepth = magsWithDepth(mags);
  const filteredWithDepth = searchLower
    ? orderedWithDepth.filter(({ mag }) => {
        const tag = `mag-${mag.uid}`;
        return (
          mag.name.toLowerCase().includes(searchLower) ||
          mag.uid.toLowerCase().includes(searchLower) ||
          tag.includes(searchLower)
        );
      })
    : orderedWithDepth;

  const totalItems = filteredWithDepth.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const start = (page - 1) * pageSize;
  const paginatedRows = filteredWithDepth.slice(start, start + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchLower]);

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
    setParentId(null);
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
          parent_id: parentId || null,
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
      {!membershipEnabled && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-2 py-3">
            <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Memberships are disabled for this site. Enable the <strong>Memberships</strong> feature in your site settings (or ask your admin) to create and manage MAGs. While disabled, no sync runs and content is not gated by membership.
            </p>
          </CardContent>
        </Card>
      )}

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
          ) : filteredWithDepth.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No memberships match your search.
            </div>
          ) : (
            <>
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
                {paginatedRows.map(({ mag, depth }) => (
                  <tr
                    key={mag.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3" style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
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
            {totalItems > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing {totalItems === 0 ? 0 : start + 1}–{Math.min(start + pageSize, totalItems)} of {totalItems}
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v) as 25 | 50 | 100);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[5.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[6rem] text-center text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
            </>
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
              <div className="space-y-2">
                <Label>Parent (optional)</Label>
                <Select
                  value={parentId ?? "none"}
                  onValueChange={(v) => setParentId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None — top-level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — top-level</SelectItem>
                    {mags.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-tight">
                  Child membership: assigning a contact here also grants all parent MAGs.
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
