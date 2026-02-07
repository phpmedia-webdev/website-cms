"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { TenantUserWithAssignment } from "@/types/tenant-users";
import { EditTenantAssignmentModal } from "@/components/superadmin/EditTenantAssignmentModal";
import { Loader2, UserPlus, Pencil } from "lucide-react";

interface RelatedTenantUsersClientProps {
  siteId: string;
  siteName: string;
}

export function RelatedTenantUsersClient({ siteId, siteName }: RelatedTenantUsersClientProps) {
  const [list, setList] = useState<TenantUserWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<{ slug: string; label: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addRole, setAddRole] = useState("viewer");
  const [addIsOwner, setAddIsOwner] = useState(false);
  const [addInvite, setAddInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TenantUserWithAssignment | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${siteId}/users`);
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Fetch tenant site users:", e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [siteId]);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.roles && Array.isArray(data.roles)) {
          setRoles(data.roles.map((r: { slug: string; label: string }) => ({ slug: r.slug, label: r.label })));
        }
      })
      .catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${siteId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail.trim(),
          display_name: addDisplayName.trim() || null,
          role_slug: addRole,
          is_owner: addIsOwner,
          invite: addInvite,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add user");
        return;
      }
      setAddEmail("");
      setAddDisplayName("");
      setAddIsOwner(false);
      setShowAdd(false);
      fetchUsers();
    } catch (e) {
      setAddError("Failed to add user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Related Tenant Users</h2>
        {!showAdd ? (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add user
          </Button>
        ) : null}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-md border p-4 space-y-3 bg-muted/30">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-display-name">Display name</Label>
              <Input
                id="add-display-name"
                value={addDisplayName}
                onChange={(e) => setAddDisplayName(e.target.value)}
                placeholder="Optional"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <Label htmlFor="add-role" className="sr-only">Role</Label>
              <select
                id="add-role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {roles.length ? roles.map((r) => (
                  <option key={r.slug} value={r.slug}>{r.label}</option>
                )) : (
                  <>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="creator">Creator</option>
                    <option value="viewer">Viewer</option>
                  </>
                )}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addIsOwner}
                onChange={(e) => setAddIsOwner(e.target.checked)}
              />
              Owner (can remove other admins; only superadmin can set)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addInvite}
                onChange={(e) => setAddInvite(e.target.checked)}
              />
              Send invite email (for new users)
            </label>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setAddError(null); }} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-md border overflow-hidden">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No users assigned yet. Add a user to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Display name</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={`${u.id}-${u.tenant_id}`} className="border-b last:border-0">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.display_name || "—"}</td>
                  <td className="px-4 py-2">
                    <span className="mr-2">{u.role_slug}</span>
                    {u.is_owner && (
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{u.status ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(u)}
                      className="h-8"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EditTenantAssignmentModal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        tenantSiteId={siteId}
        tenantUserId={editing?.id ?? ""}
        siteName={siteName}
        userDisplayLabel={editing ? (editing.display_name ? `${editing.email} (${editing.display_name})` : editing.email) : ""}
        initialRole={editing?.role_slug ?? "viewer"}
        initialIsOwner={editing?.is_owner ?? false}
        roles={roles}
        onSaved={fetchUsers}
        onRemoved={fetchUsers}
      />
    </div>
  );
}
