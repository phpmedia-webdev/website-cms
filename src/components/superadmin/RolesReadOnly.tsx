"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, ChevronRight } from "lucide-react";

export interface RoleDisplayItem {
  id?: string;
  name?: string;
  slug: string;
  label: string;
  features?: { slug: string; label: string; isEnabled?: boolean }[];
  permissions?: { slug: string; label: string; isEnabled?: boolean }[];
}

/**
 * M5: Read-only list of roles from PHP-Auth (website-cms scope).
 * Card-in-list view; each card is clickable and links to role detail (permissions/features reference).
 * Role modifications are done only in the PHP-Auth app.
 */
export function RolesReadOnly() {
  const [roles, setRoles] = useState<RoleDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/admin/roles?for=display", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setRoles(Array.isArray(data?.roles) ? data.roles : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load roles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (roles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-2">
          <p className="text-sm text-muted-foreground">No roles found. Add roles in the PHP-Auth app (scope website-cms).</p>
          <p className="text-xs text-muted-foreground">
            Debug: Check server terminal for [getRolesForAssignmentFromPhpAuth] logs, or open <code className="rounded bg-muted px-1">/api/admin/php-auth-status</code> (superadmin) for rolesProbe and response snippet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3 list-none p-0 m-0">
      {roles.map((role) => (
        <li key={role.slug}>
          <Link href={`/admin/super/roles/${encodeURIComponent(role.slug)}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 pt-6 pb-6">
                <Shield className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.slug}</p>
                  {Array.isArray(role.features) && Array.isArray(role.permissions) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.features.length} feature{role.features.length !== 1 ? "s" : ""}, {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
