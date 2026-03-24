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
import type { ResourceAdmin } from "@/lib/supabase/participants-resources";
import type { CalendarResourceTypeOption } from "@/lib/supabase/settings";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ASSET_STATUSES = ["active", "maintenance", "retired"] as const;

interface ResourcesRegistryTabProps {
  resources: ResourceAdmin[];
  setResources: (rows: ResourceAdmin[]) => void;
  initialResourceTypes?: CalendarResourceTypeOption[];
}

export function ResourcesRegistryTab({
  resources,
  setResources,
  initialResourceTypes = [],
}: ResourcesRegistryTabProps) {
  const [resourceTypes, setResourceTypes] = useState<CalendarResourceTypeOption[]>(initialResourceTypes);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceAdmin | null>(null);
  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState<string>(
    () => initialResourceTypes[0]?.slug ?? ""
  );
  const [isExclusive, setIsExclusive] = useState(true);
  const [schedCalendar, setSchedCalendar] = useState(true);
  const [schedTasks, setSchedTasks] = useState(true);
  const [assetStatus, setAssetStatus] = useState<string>("active");
  const [archived, setArchived] = useState(false);
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
    setSchedCalendar(true);
    setSchedTasks(true);
    setAssetStatus("active");
    setArchived(false);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (r: ResourceAdmin) => {
    setEditing(r);
    setName(r.name);
    setResourceType(r.resource_type);
    setIsExclusive(r.is_exclusive);
    setSchedCalendar(r.is_schedulable_calendar ?? true);
    setSchedTasks(r.is_schedulable_tasks ?? false);
    setAssetStatus(
      ASSET_STATUSES.includes(r.asset_status as (typeof ASSET_STATUSES)[number])
        ? r.asset_status
        : "active"
    );
    setArchived(!!r.archived_at);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        resource_type: resourceType,
        is_exclusive: isExclusive,
        is_schedulable_calendar: schedCalendar,
        is_schedulable_tasks: schedTasks,
        asset_status: assetStatus,
      };
      if (editing) {
        body.archived_at = archived
          ? editing.archived_at ?? new Date().toISOString()
          : null;
        const res = await fetch(`/api/events/resources/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
          body: JSON.stringify(body),
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

  const handleDelete = async (r: ResourceAdmin) => {
    if (
      !confirm(
        `Delete "${r.name}"? This removes it from bundles, events, and tasks that reference it.`
      )
    )
      return;
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
          <Plus className="mr-2 h-4 w-4" />
          Add resource
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : resources.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No resources yet. Add registry items (rooms, equipment, etc.) to assign to events, tasks, and
          bundles.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-center font-medium">Exclusive</th>
                <th className="p-3 text-center font-medium">Calendar</th>
                <th className="p-3 text-center font-medium">Tasks</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-center font-medium">Archived</th>
                <th className="w-24 p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{typeLabel(r.resource_type)}</td>
                  <td className="p-3 text-center text-muted-foreground">
                    {r.is_exclusive ? "Yes" : "No"}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">
                    {r.is_schedulable_calendar !== false ? "Yes" : "No"}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">
                    {r.is_schedulable_tasks ? "Yes" : "No"}
                  </td>
                  <td className="p-3 capitalize text-muted-foreground">{r.asset_status ?? "active"}</td>
                  <td className="p-3 text-center text-muted-foreground">
                    {r.archived_at ? "Yes" : "No"}
                  </td>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit resource" : "Add resource"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
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
              <Select value={resourceType} onValueChange={setResourceType}>
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
                Exclusive (one booking per time slot for events)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="resource-cal"
                checked={schedCalendar}
                onCheckedChange={(v) => setSchedCalendar(!!v)}
              />
              <Label htmlFor="resource-cal" className="cursor-pointer text-sm">
                Schedulable on calendar / events
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="resource-tasks"
                checked={schedTasks}
                onCheckedChange={(v) => setSchedTasks(!!v)}
              />
              <Label htmlFor="resource-tasks" className="cursor-pointer text-sm">
                Schedulable on tasks
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-status">Asset status</Label>
              <Select value={assetStatus} onValueChange={setAssetStatus}>
                <SelectTrigger id="asset-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="resource-archived"
                  checked={archived}
                  onCheckedChange={(v) => setArchived(!!v)}
                />
                <Label htmlFor="resource-archived" className="cursor-pointer text-sm">
                  Archived (hidden from pickers when combined with flags above)
                </Label>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
