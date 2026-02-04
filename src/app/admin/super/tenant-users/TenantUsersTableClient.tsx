"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TenantUserWithAssignment } from "@/types/tenant-users";
export function TenantUsersTableClient() {
  const [list, setList] = useState<TenantUserWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/tenant-users")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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
        <Link href="/admin/super/tenant-sites" className="text-primary hover:underline">
          Tenant Sites
        </Link>{" "}
        → open a site → Related Tenant Users → Add user.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-2 font-medium">Email</th>
            <th className="text-left px-4 py-2 font-medium">Display name</th>
            <th className="text-left px-4 py-2 font-medium">Site</th>
            <th className="text-left px-4 py-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u) => (
            <tr key={`${u.id}-${u.tenant_id}`} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2 text-muted-foreground">{u.display_name || "—"}</td>
              <td className="px-4 py-2">{u.tenant_name ?? u.tenant_id}</td>
              <td className="px-4 py-2">{u.role_slug}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
