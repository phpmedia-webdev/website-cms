"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { orderedFeatures } from "@/lib/supabase/feature-registry";
import type { AdminRole, FeatureRegistry } from "@/types/feature-registry";

type RoleFeatureIds = Record<string, string[]>;

export function RolesManager() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [features, setFeatures] = useState<FeatureRegistry[]>([]);
  const [roleFeatureIds, setRoleFeatureIds] = useState<RoleFeatureIds>({});
  const [selectedRoleSlug, setSelectedRoleSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingFeatureId, setSavingFeatureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => orderedFeatures(features), [features]);

  /** Child feature IDs for a given parent feature id (one level: direct children only). */
  const getChildFeatureIds = (parentId: string) =>
    features.filter((f) => f.parent_id === parentId).map((f) => f.id);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (roles.length > 0 && !selectedRoleSlug) {
      setSelectedRoleSlug(roles[0].slug);
    }
  }, [roles, selectedRoleSlug]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to load roles and features");
      const data = await res.json();
      setRoles(data.roles ?? []);
      setFeatures(data.features ?? []);
      setRoleFeatureIds(data.roleFeatureIds ?? {});
      if (data.roles?.length && !selectedRoleSlug) {
        setSelectedRoleSlug(data.roles[0].slug);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureId: string, checked: boolean) => {
    if (!selectedRoleSlug) return;
    const feature = features.find((f) => f.id === featureId);
    const childIds = getChildFeatureIds(featureId);
    const current = roleFeatureIds[selectedRoleSlug] ?? [];

    let next: string[];
    if (!feature?.parent_id) {
      // Top-level: turning ON adds this + all children; turning OFF removes this + all children
      if (checked) {
        next = [...new Set([...current, featureId, ...childIds])];
      } else {
        const childSet = new Set(childIds);
        next = current.filter(
          (id) => id !== featureId && !childSet.has(id)
        );
      }
    } else {
      // Sub-level: only this feature
      next = checked
        ? [...current, featureId]
        : current.filter((id) => id !== featureId);
    }

    setRoleFeatureIds((prev) => ({ ...prev, [selectedRoleSlug]: next }));
    setSavingFeatureId(featureId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRoleSlug}/features`, {
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
      setRoleFeatureIds((prev) => ({ ...prev, [selectedRoleSlug]: current }));
    } finally {
      setSavingFeatureId(null);
    }
  };

  const isChecked = (featureId: string) =>
    selectedRoleSlug
      ? (roleFeatureIds[selectedRoleSlug] ?? []).includes(featureId)
      : false;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading roles and features…
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
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              Role
            </label>
            <Select
              value={selectedRoleSlug}
              onValueChange={(v) => setSelectedRoleSlug(v)}
            >
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.slug} value={role.slug}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Toggle features for the selected role. On = allowed; off = not allowed. Turning a <strong>top-level</strong> (e.g. CRM) <strong>on</strong> turns on all sub-items; turning it <strong>off</strong> turns off all sub-items. You can then turn individual sub-items on manually. Changes save automatically.
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
                    disabled={savingFeatureId === feature.id || !selectedRoleSlug}
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
