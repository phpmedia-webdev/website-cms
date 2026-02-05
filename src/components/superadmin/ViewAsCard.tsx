"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VIEW_AS_COOKIE_NAME, viewAsCookieValue } from "@/lib/admin/view-as";
import type { TenantSite } from "@/types/tenant-sites";
import type { AdminRole } from "@/types/feature-registry";

const VIEW_AS_COOKIE_MAX_AGE = 86400; // 1 day in seconds

interface ViewAsCardProps {
  sites: TenantSite[];
  roles: AdminRole[];
  /** When set, view-as is active (from cookie). Card shows current state and Exit. */
  initialViewAs: { siteId: string; roleSlug: string } | null;
}

function ensureString(x: unknown): string {
  return typeof x === "string" ? x : "";
}

export function ViewAsCard({ sites, roles, initialViewAs }: ViewAsCardProps) {
  const router = useRouter();
  const [siteId, setSiteId] = useState(() => ensureString(initialViewAs?.siteId));
  const [roleSlug, setRoleSlug] = useState(() => ensureString(initialViewAs?.roleSlug));

  const active = !!initialViewAs;
  const currentSite = active ? sites.find((s) => s.id === initialViewAs.siteId) : null;
  const currentRole = active ? roles.find((r) => r.slug === initialViewAs.roleSlug) : null;

  function startViewAs() {
    if (!siteId || !roleSlug) return;
    const value = viewAsCookieValue(siteId, roleSlug);
    document.cookie = `${VIEW_AS_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${VIEW_AS_COOKIE_MAX_AGE}; SameSite=Lax`;
    router.refresh();
  }

  function exitViewAs() {
    document.cookie = `${VIEW_AS_COOKIE_NAME}=; path=/; max-age=0`;
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>View as Role + Site</CardTitle>
        <CardDescription>
          Test sidebar and route restrictions for a tenant and role. Superadmin section stays available so you can exit here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Currently viewing as <strong>{currentSite?.name ?? "—"}</strong>
              <span aria-hidden> · </span>
              <strong>{currentRole?.label ?? currentRole?.slug ?? "—"}</strong>
            </p>
            <Button variant="destructive" size="sm" onClick={exitViewAs}>
              Exit View As
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Site</label>
                <Select
                  value={ensureString(siteId)}
                  onValueChange={(val) => setSiteId(ensureString(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={ensureString(roleSlug)}
                  onValueChange={(val) => setRoleSlug(ensureString(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((r) => r.slug != null && r.slug !== "")
                      .map((r) => (
                        <SelectItem key={r.slug} value={r.slug}>
                          {r.label || r.slug}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={startViewAs} disabled={!siteId || !roleSlug}>
              View as
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
