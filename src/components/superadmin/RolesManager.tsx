"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { orderedFeatures } from "@/lib/supabase/feature-registry";
import type { AdminRole, FeatureRegistry } from "@/types/feature-registry";

type RoleFeatureIds = Record<string, string[]>;

export interface RoleFeaturesEditorProps {
  /** Role to edit; required when used on /admin/super/roles/[roleSlug]. */
  roleSlug: string;
}

/**
 * Editor for a single role's feature toggles. Used on the inner page
 * /admin/super/roles/[roleSlug]. No role selector; role is fixed from the URL.
 */
export function RoleFeaturesEditor({ roleSlug }: RoleFeaturesEditorProps) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [features, setFeatures] = useState<FeatureRegistry[]>([]);
  const [roleFeatureIds, setRoleFeatureIds] = useState<RoleFeatureIds>({});
  const [loading, setLoading] = useState(true);
  const [savingFeatureId, setSavingFeatureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => orderedFeatures(features), [features]);

  const getChildFeatureIds = (parentId: string) =>
    features.filter((f) => f.parent_id === parentId).map((f) => f.id);

  useEffect(() => {
    load();
  }, [roleSlug]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to load roles and features");
      const data = await res.json();
      const roles: AdminRole[] = data.roles ?? [];
      const found = roles.find((r: AdminRole) => r.slug === roleSlug);
      setRole(found ?? null);
      setFeatures(data.features ?? []);
      setRoleFeatureIds(data.roleFeatureIds ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureId: string, checked: boolean) => {
    const feature = features.find((f) => f.id === featureId);
    const childIds = getChildFeatureIds(featureId);
    const current = roleFeatureIds[roleSlug] ?? [];

    let next: string[];
    if (!feature?.parent_id) {
      if (checked) {
        next = [...new Set([...current, featureId, ...childIds])];
      } else {
        const childSet = new Set(childIds);
        next = current.filter(
          (id) => id !== featureId && !childSet.has(id)
        );
      }
    } else {
      next = checked
        ? [...current, featureId]
        : current.filter((id) => id !== featureId);
    }

    setRoleFeatureIds((prev) => ({ ...prev, [roleSlug]: next }));
    setSavingFeatureId(featureId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/roles/${roleSlug}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureIds: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setRoleFeatureIds((prev) => ({ ...prev, [roleSlug]: current }));
    } finally {
      setSavingFeatureId(null);
    }
  };

  const isChecked = (featureId: string) =>
    (roleFeatureIds[roleSlug] ?? []).includes(featureId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading features…
      </div>
    );
  }

  if (error && !role) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-2" onClick={load}>
            Retry
          </Button>
          <Button variant="ghost" className="mt-2 ml-2" asChild>
            <Link href="/admin/super/roles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to roles
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!role) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-muted-foreground">Role not found.</p>
          <Button variant="ghost" className="mt-2" asChild>
            <Link href="/admin/super/roles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to roles
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/super/roles">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to roles
              </Link>
            </Button>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{role.label}</h2>
            {role.description && (
              <p className="text-sm text-muted-foreground">{role.description}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Toggle features for this role. On = allowed; off = not allowed. Turning a <strong>top-level</strong> (e.g. CRM) <strong>on</strong> turns on all sub-items; turning it <strong>off</strong> turns off all sub-items. You can then turn individual sub-items on manually. Changes save automatically.
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="border rounded-md divide-y">
            {ordered.map((feature) => (
              <div
                key={feature.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors",
                  feature.parent_id && "pl-8"
                )}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{feature.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {savingFeatureId === feature.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={isChecked(feature.id)}
                    onCheckedChange={(checked) =>
                      toggleFeature(feature.id, checked)
                    }
                    disabled={savingFeatureId === feature.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
