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
import type { RoleOption } from "@/lib/php-auth/role-mapping";

const VIEW_AS_COOKIE_MAX_AGE = 86400; // 1 day in seconds

interface ViewAsCardProps {
  /** Current logged-in site (from schema). View-as uses this site; no site picker. */
  currentSite: TenantSite | null;
  roles: RoleOption[];
  /** When set, view-as is active (from cookie). Card shows current state and Exit. */
  initialViewAs: { siteId: string; roleSlug: string } | null;
}

function ensureString(x: unknown): string {
  return typeof x === "string" ? x : "";
}

export function ViewAsCard({ currentSite, roles, initialViewAs }: ViewAsCardProps) {
  const router = useRouter();
  const [roleSlug, setRoleSlug] = useState(() => ensureString(initialViewAs?.roleSlug));

  const active = !!initialViewAs;
  const currentRole = active ? roles.find((r) => r.slug === initialViewAs.roleSlug) : null;
  const siteId = currentSite?.id ?? "";

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
        <CardTitle>View Site As:</CardTitle>
        <CardDescription>
          Test sidebar and route restrictions for the current site as a different role. Superadmin section stays available so you can exit here.
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
            <Button onClick={startViewAs} disabled={!currentSite || !roleSlug}>
              View as
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
