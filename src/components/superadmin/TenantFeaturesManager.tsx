"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureRegistry } from "@/types/feature-registry";

interface TenantFeaturesManagerProps {
  tenantId: string;
  features: FeatureRegistry[];
  initialFeatureIds: string[];
}

export function TenantFeaturesManager({
  tenantId,
  features,
  initialFeatureIds,
}: TenantFeaturesManagerProps) {
  const [featureIds, setFeatureIds] = useState<string[]>(initialFeatureIds);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFeatureIds(initialFeatureIds);
  }, [tenantId, initialFeatureIds]);

  const toggleFeature = async (featureId: string, checked: boolean) => {
    const next = checked
      ? [...featureIds, featureId]
      : featureIds.filter((id) => id !== featureId);
    setFeatureIds(next);
    setSavingId(featureId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
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
      setFeatureIds(featureIds);
    } finally {
      setSavingId(null);
    }
  };

  const isChecked = (featureId: string) => featureIds.includes(featureId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Features</CardTitle>
        <CardDescription>
          Maximum features for this site. Only checked items are available here; each role (in Roles) gets a subset of these. A user sees: this site’s features ∩ their role’s features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Toggle each feature on (right, blue) or off (left, grey). Changes save automatically.
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="border rounded-md divide-y">
            {features.map((feature) => (
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
                  {savingId === feature.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={isChecked(feature.id)}
                    onCheckedChange={(checked) =>
                      toggleFeature(feature.id, checked)
                    }
                    disabled={savingId === feature.id}
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
