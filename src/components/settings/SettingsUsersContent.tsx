"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TenantUserWithAssignment } from "@/types/tenant-users";
import { Loader2, UserPlus, UserMinus } from "lucide-react";

interface RoleOption {
  slug: string;
  label: string;
}

interface SettingsUsersContentProps {
  isOwner: boolean;
  isSuperadmin: boolean;
}

export function SettingsUsersContent({ isOwner, isSuperadmin }: SettingsUsersContentProps) {
  const [list, setList] = useState<TenantUserWithAssignment[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addRole, setAddRole] = useState("viewer");
  const [addInvite, setAddInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/team");
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data.users) ? data.users : []);
        setRoles(Array.isArray(data.roles) ? data.roles : []);
      }
    } catch (e) {
      console.error("Fetch team:", e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail.trim(),
          display_name: addDisplayName.trim() || null,
          role_slug: addRole,
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
      setShowAdd(false);
      fetchTeam();
    } catch {
      setAddError("Failed to add user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/settings/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role_slug: newRole }),
      });
      if (res.ok) fetchTeam();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (user: TenantUserWithAssignment) => {
    if (user.is_owner && !isSuperadmin) return;
    if (!confirm(`Remove ${user.email} from this site?`)) return;
    setUpdatingId(user.id);
    try {
      const res = await fetch("/api/settings/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) fetchTeam();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to remove user");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const canRemove = (u: TenantUserWithAssignment) => u.is_owner ? isSuperadmin : true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage who has access to this site. Only admins can add or remove users.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Site users</h2>
        {!showAdd ? (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add user
          </Button>
        ) : null}
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border bg-muted/30 p-4 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
              <Label htmlFor="add-role" className="sr-only">
                Role
              </Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger id="add-role" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.length
                    ? roles.map((r) => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {r.label}
                        </SelectItem>
                      ))
                    : [
                        { slug: "admin", label: "Admin" },
                        { slug: "editor", label: "Editor" },
                        { slug: "creator", label: "Creator" },
                        { slug: "viewer", label: "Viewer" },
                      ].map((r) => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {r.label}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addInvite}
                onChange={(e) => setAddInvite(e.target.checked)}
              />
              Send invite email (for new users)
            </label>
          </div>
          {addError && (
            <p className="text-sm text-destructive">{addError}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                setAddError(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No users assigned yet. Add a user to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Display name</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr
                  key={`${u.id}-${u.tenant_id}`}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.display_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.role_slug}
                        onValueChange={(value) => handleRoleChange(u.id, value)}
                        disabled={updatingId === u.id}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.slug} value={r.slug}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {u.is_owner && (
                        <Badge variant="secondary" className="text-xs">
                          Owner
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.status ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canRemove(u) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(u)}
                        disabled={updatingId === u.id}
                      >
                        {updatingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Owner (superadmin only)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
