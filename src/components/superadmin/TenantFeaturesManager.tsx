"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFeatureIds(initialFeatureIds);
  }, [tenantId, initialFeatureIds]);

  const toggleFeature = (featureId: string, checked: boolean) => {
    setFeatureIds((prev) =>
      checked ? [...prev, featureId] : prev.filter((id) => id !== featureId)
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isChecked = (featureId: string) => featureIds.includes(featureId);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Features enabled for this tenant
            </h3>
            <Button onClick={save} disabled={saving} className="h-9">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="border rounded-md divide-y">
            {features.map((feature) => (
              <label
                key={feature.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors",
                  feature.parent_id && "pl-8"
                )}
              >
                <Checkbox
                  checked={isChecked(feature.id)}
                  onCheckedChange={(checked) =>
                    toggleFeature(feature.id, checked === true)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{feature.label}</span>
                  <p className="text-sm text-muted-foreground min-h-[1rem]" aria-hidden>
                    {" "}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
