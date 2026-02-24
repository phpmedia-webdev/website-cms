"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditTenantAssignmentModal } from "@/components/superadmin/EditTenantAssignmentModal";
import type { TenantUserWithAssignment } from "@/types/tenant-users";
import { Pencil } from "lucide-react";

export function TenantUsersTableClient() {
  const [list, setList] = useState<TenantUserWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<{ slug: string; label: string }[]>([]);
  const [editing, setEditing] = useState<TenantUserWithAssignment | null>(null);

  const fetchList = () => {
    setLoading(true);
    fetch("/api/admin/tenant-users")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    fetch("/api/admin/roles?for=assignment")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.roles && Array.isArray(data.roles)) {
          setRoles(data.roles.map((r: { slug: string; label: string }) => ({ slug: r.slug, label: r.label })));
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="rounded-md border px-4 py-8 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-md border px-4 py-8 text-center text-muted-foreground">
        No tenant user assignments yet. Add users from{" "}
        <Link href="/admin/super" className="text-primary hover:underline">
          Dashboard
        </Link>{" "}
        → open current site → Related Tenant Users → Add user.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Display name</th>
              <th className="text-left px-4 py-2 font-medium">Site</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Owner</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={`${u.id}-${u.tenant_id}`} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 text-muted-foreground">{u.display_name || "—"}</td>
                <td className="px-4 py-2">{u.tenant_name ?? u.tenant_id}</td>
                <td className="px-4 py-2">{u.role_slug}</td>
                <td className="px-4 py-2">
                  {u.is_owner ? (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  ) : (
                    "—"
                  )}
                </td>
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
      </div>

      <EditTenantAssignmentModal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        tenantSiteId={editing?.tenant_id ?? ""}
        tenantUserId={editing?.id ?? ""}
        siteName={editing?.tenant_name ?? editing?.tenant_id ?? ""}
        userDisplayLabel={editing ? (editing.display_name ? `${editing.email} (${editing.display_name})` : editing.email) : ""}
        initialRole={editing?.role_slug && roles.some((r) => r.slug === editing.role_slug) ? editing.role_slug : (roles[0]?.slug ?? "")}
        initialIsOwner={editing?.is_owner ?? false}
        roles={roles}
        onSaved={fetchList}
        onRemoved={fetchList}
      />
    </>
  );
}
