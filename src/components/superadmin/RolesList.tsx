"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronRight, Shield, Plus, Lock, Trash2 } from "lucide-react";
import type { AdminRole } from "@/types/feature-registry";

/** Slugs that cannot be deleted (same as feature-registry SYSTEM_ROLE_SLUGS). */
const SYSTEM_ROLE_SLUGS = ["admin", "editor", "creator", "viewer"];

function isSystemRole(role: AdminRole): boolean {
  return role.is_system || SYSTEM_ROLE_SLUGS.includes(role.slug);
}

export function RolesList() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSlug, setAddSlug] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      const data = await res.json();
      setRoles(data.roles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setAddSlug("");
    setAddLabel("");
    setAddDescription("");
    setAddError(null);
    setAddOpen(true);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = addSlug.trim() || addLabel.trim();
    const label = addLabel.trim() || addSlug.trim();
    if (!slug || !label) {
      setAddError("Slug and label are required.");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.toLowerCase().replace(/\s+/g, "_"),
          label,
          description: addDescription.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error ?? "Failed to create role");
        return;
      }
      setAddOpen(false);
      await load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to create role");
    } finally {
      setAddSubmitting(false);
    }
  };

  const confirmDelete = (slug: string) => setDeleteSlug(slug);
  const cancelDelete = () => {
    setDeleteSlug(null);
    setDeleteError(null);
  };

  const submitDelete = async () => {
    if (!deleteSlug) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(deleteSlug)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete role");
        return;
      }
      setDeleteSlug(null);
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete role");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading roles…
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-2" onClick={load}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add role
        </Button>
      </div>

      <div className="grid gap-2">
        {roles.map((role) => (
          <Card key={role.slug} className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 py-4">
              <Link
                href={`/admin/super/roles/${encodeURIComponent(role.slug)}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{role.label}</p>
                  {role.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {role.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {isSystemRole(role) ? (
                  <span
                    className="rounded p-1.5 text-muted-foreground"
                    title="System role (cannot be deleted)"
                  >
                    <Lock className="h-4 w-4" />
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      confirmDelete(role.slug);
                    }}
                    aria-label={`Delete ${role.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add role dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>
              Create a new role. You can assign features to it after saving. Slug will be used in URLs and APIs (lowercase, letters, numbers, underscores).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-role-slug">Slug</Label>
              <Input
                id="add-role-slug"
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                placeholder="e.g. marketing_manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role-label">Label</Label>
              <Input
                id="add-role-label"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="e.g. Marketing Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role-desc">Description (optional)</Label>
              <Input
                id="add-role-desc"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={addSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addSubmitting}>
                {addSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create role"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteSlug} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              This will remove the role and its feature assignments. Users assigned this role will need to be reassigned. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={cancelDelete}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
