"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";

interface RoleOption {
  slug: string;
  label: string;
}

/**
 * M5: Read-only list of roles from PHP-Auth (website-cms scope).
 * No create/edit; roles are managed in the PHP-Auth app.
 */
export function RolesReadOnly() {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/admin/roles?for=assignment")
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
          {/* DEBUG: remove when done — hint for debugging empty roles */}
          <p className="text-xs text-muted-foreground">
            Debug: Check server terminal for [getRolesForAssignmentFromPhpAuth] logs, or open <code className="rounded bg-muted px-1">/api/admin/php-auth-status</code> (superadmin) for rolesProbe and response snippet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <Card key={role.slug}>
          <CardContent className="flex items-center gap-3 pt-6">
            <Shield className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">{role.label}</p>
              <p className="text-xs text-muted-foreground">{role.slug}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
