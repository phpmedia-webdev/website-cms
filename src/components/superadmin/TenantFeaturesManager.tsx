"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TenantFeatureItem = { slug: string; label: string; order: number };

interface TenantFeaturesManagerProps {
  tenantId: string;
  features: TenantFeatureItem[];
  initialEnabledSlugs: string[];
}

export function TenantFeaturesManager({
  tenantId,
  features,
  initialEnabledSlugs,
}: TenantFeaturesManagerProps) {
  const [enabledSlugs, setEnabledSlugs] = useState<string[]>(initialEnabledSlugs);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabledSlugs(initialEnabledSlugs);
  }, [tenantId, initialEnabledSlugs]);

  const toggleFeature = async (slug: string, checked: boolean) => {
    const next = checked
      ? [...enabledSlugs, slug]
      : enabledSlugs.filter((s) => s !== slug);
    setEnabledSlugs(next);
    setSavingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureSlugs: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setEnabledSlugs(enabledSlugs);
    } finally {
      setSavingSlug(null);
    }
  };

  const isChecked = (slug: string) => enabledSlugs.includes(slug);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Features</CardTitle>
        <CardDescription>
          Maximum features for this site. Only checked items are available here; each role (in Roles) gets a subset of these. A user sees: this site's features ∩ their role's features.
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
                key={feature.slug}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                )}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{feature.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {savingSlug === feature.slug && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={isChecked(feature.slug)}
                    onCheckedChange={(checked) =>
                      toggleFeature(feature.slug, checked)
                    }
                    disabled={savingSlug === feature.slug}
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
