"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Resource } from "@/lib/supabase/participants-resources";
import type { CalendarResourceTypeOption } from "@/lib/supabase/settings";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ResourcesListClientProps {
  initialResources: Resource[];
  initialResourceTypes?: CalendarResourceTypeOption[];
}

export function ResourcesListClient({
  initialResources,
  initialResourceTypes = [],
}: ResourcesListClientProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [resourceTypes, setResourceTypes] = useState<CalendarResourceTypeOption[]>(initialResourceTypes);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState<string>(
    () => initialResourceTypes[0]?.slug ?? ""
  );
  const [isExclusive, setIsExclusive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialResourceTypes.length > 0) {
      setResourceTypes(initialResourceTypes);
      if (!resourceType && initialResourceTypes[0]) setResourceType(initialResourceTypes[0].slug);
    } else {
      fetch("/api/settings/calendar/resource-types")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setResourceTypes(data);
            setResourceType((prev) => prev || data[0].slug);
          } else {
            setResourceTypes([
              { slug: "room", label: "Room" },
              { slug: "equipment", label: "Equipment" },
              { slug: "video", label: "Video" },
            ]);
            setResourceType((prev) => prev || "room");
          }
        })
        .catch(() => {
          setResourceTypes([
            { slug: "room", label: "Room" },
            { slug: "equipment", label: "Equipment" },
            { slug: "video", label: "Video" },
          ]);
          setResourceType((prev) => prev || "room");
        });
    }
  }, [initialResourceTypes.length]);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events/resources");
      const data = await res.json().catch(() => ({}));
      setResources(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const typeLabel = (slug: string) =>
    resourceTypes.find((t) => t.slug === slug)?.label ?? slug;

  const openAdd = () => {
    setEditing(null);
    setName("");
    setResourceType(resourceTypes[0]?.slug ?? "room");
    setIsExclusive(true);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditing(r);
    setName(r.name);
    setResourceType(r.resource_type);
    setIsExclusive(r.is_exclusive);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (editing) {
        const res = await fetch(`/api/events/resources/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            resource_type: resourceType,
            is_exclusive: isExclusive,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Update failed");
          return;
        }
      } else {
        const res = await fetch("/api/events/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            resource_type: resourceType,
            is_exclusive: isExclusive,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Create failed");
          return;
        }
      }
      setDialogOpen(false);
      fetchResources();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r: Resource) => {
    if (!confirm(`Delete "${r.name}"? This will remove it from any events that use it.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/resources/${r.id}`, { method: "DELETE" });
      if (res.ok) fetchResources();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Delete failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add resource
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          No resources yet. Add a room, equipment, or video resource to assign to events.
        </p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium p-3">Name</th>
                <th className="text-left font-medium p-3">Type</th>
                <th className="text-left font-medium p-3">Exclusive</th>
                <th className="text-right font-medium p-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{typeLabel(r.resource_type)}</td>
                  <td className="p-3">{r.is_exclusive ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(r)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r)}
                      aria-label="Delete"
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit resource" : "Add resource"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Conference Room A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource-type">Type</Label>
              <Select
                value={resourceType}
                onValueChange={setResourceType}
              >
                <SelectTrigger id="resource-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="resource-exclusive"
                checked={isExclusive}
                onCheckedChange={(v) => setIsExclusive(!!v)}
              />
              <Label htmlFor="resource-exclusive" className="cursor-pointer text-sm">
                Exclusive (one event per time slot)
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? "Saving…" : editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
