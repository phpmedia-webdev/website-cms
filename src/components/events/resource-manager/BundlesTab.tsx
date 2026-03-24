"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { ResourceAdmin, ResourceBundleWithItems } from "@/lib/supabase/participants-resources";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

interface BundlesTabProps {
  initialBundles: ResourceBundleWithItems[];
  resources: ResourceAdmin[];
}

export function BundlesTab({ initialBundles, resources }: BundlesTabProps) {
  const [bundles, setBundles] = useState<ResourceBundleWithItems[]>(initialBundles);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ResourceBundleWithItems | null>(null);
  const [bundleName, setBundleName] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [addResourceId, setAddResourceId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events/bundles");
      const data = await res.json().catch(() => ({}));
      setBundles(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setBundles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBundles(initialBundles);
  }, [initialBundles]);

  const resourceOptions = useMemo(
    () =>
      [...resources].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [resources]
  );

  const openCreate = () => {
    setBundleName("");
    setBundleDescription("");
    setError(null);
    setCreateOpen(true);
  };

  const openEdit = (b: ResourceBundleWithItems) => {
    setEditingBundle(b);
    setBundleName(b.name);
    setBundleDescription(b.description ?? "");
    setAddResourceId("");
    setError(null);
    setEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bundleName.trim(),
          description: bundleDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Create failed");
        return;
      }
      setCreateOpen(false);
      await fetchBundles();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBundleMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBundle) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/bundles/${editingBundle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bundleName.trim(),
          description: bundleDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      const refreshed = await fetch(`/api/events/bundles/${editingBundle.id}`).then((r) =>
        r.json()
      );
      if (refreshed?.data) {
        setEditingBundle(refreshed.data);
      }
      await fetchBundles();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!editingBundle || !addResourceId) return;
    setError(null);
    setSubmitting(true);
    try {
      const nextOrder =
        editingBundle.items.length > 0
          ? Math.max(...editingBundle.items.map((i) => i.sort_order)) + 1
          : 0;
      const res = await fetch(`/api/events/bundles/${editingBundle.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource_id: addResourceId, sort_order: nextOrder }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Add failed");
        return;
      }
      setAddResourceId("");
      const detail = await fetch(`/api/events/bundles/${editingBundle.id}`).then((r) => r.json());
      if (detail?.data) setEditingBundle(detail.data);
      await fetchBundles();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (resourceId: string) => {
    if (!editingBundle) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/bundles/${editingBundle.id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource_id: resourceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Remove failed");
        return;
      }
      const detail = await fetch(`/api/events/bundles/${editingBundle.id}`).then((r) => r.json());
      if (detail?.data) setEditingBundle(detail.data);
      await fetchBundles();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBundle = async (b: ResourceBundleWithItems) => {
    if (
      !confirm(
        `Delete bundle "${b.name}"? This does not delete the resources in the registry—only the bundle definition.`
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/bundles/${b.id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingBundle?.id === b.id) {
          setEditOpen(false);
          setEditingBundle(null);
        }
        await fetchBundles();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Delete failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const idsInBundle = useMemo(() => {
    if (!editingBundle) return new Set<string>();
    return new Set(editingBundle.items.map((i) => i.resource_id));
  }, [editingBundle]);

  const addableResources = resourceOptions.filter((r) => !idsInBundle.has(r.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New bundle
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : bundles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No bundles yet. Create a bundle, then add resources from your registry. Applying a bundle to
          an event or task copies its members into that booking (snapshot).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Bundle</th>
                <th className="p-3 text-left font-medium">Description</th>
                <th className="p-3 text-center font-medium">Resources</th>
                <th className="w-24 p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      {b.name}
                    </div>
                  </td>
                  <td className="max-w-xs truncate p-3 text-muted-foreground">
                    {b.description || "—"}
                  </td>
                  <td className="p-3 text-center tabular-nums text-muted-foreground">
                    {b.items.length}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(b)}
                      aria-label="Edit bundle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => void handleDeleteBundle(b)}
                      aria-label="Delete bundle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New bundle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="bundle-name">Name</Label>
              <Input
                id="bundle-name"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="e.g. Video kit"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bundle-desc">Description (optional)</Label>
              <Textarea
                id="bundle-desc"
                value={bundleDescription}
                onChange={(e) => setBundleDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !bundleName.trim()}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingBundle(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit bundle</DialogTitle>
          </DialogHeader>
          {editingBundle ? (
            <div className="space-y-6">
              <form onSubmit={handleSaveBundleMeta} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-2">
                  <Label htmlFor="edit-bundle-name">Name</Label>
                  <Input
                    id="edit-bundle-name"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bundle-desc">Description</Label>
                  <Textarea
                    id="edit-bundle-desc"
                    value={bundleDescription}
                    onChange={(e) => setBundleDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button type="submit" size="sm" disabled={submitting || !bundleName.trim()}>
                  Save name & description
                </Button>
              </form>

              <div className="border-t pt-4">
                <h4 className="mb-2 text-sm font-medium">Resources in this bundle</h4>
                {editingBundle.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No resources yet.</p>
                ) : (
                  <ul className="mb-3 space-y-2">
                    {[...editingBundle.items]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((item) => (
                        <li
                          key={item.resource_id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="font-medium">{item.resource_name}</span>
                            {item.resource_type ? (
                              <span className="text-muted-foreground"> ({item.resource_type})</span>
                            ) : null}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            disabled={submitting}
                            onClick={() => void handleRemoveMember(item.resource_id)}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                  </ul>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label>Add resource</Label>
                    {addableResources.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        All registry resources are already in this bundle, or the registry is empty.
                      </p>
                    ) : (
                      <Select value={addResourceId || undefined} onValueChange={setAddResourceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose from registry…" />
                        </SelectTrigger>
                        <SelectContent>
                          {addableResources.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting || !addResourceId || addableResources.length === 0}
                    onClick={() => void handleAddMember()}
                  >
                    Add to bundle
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
