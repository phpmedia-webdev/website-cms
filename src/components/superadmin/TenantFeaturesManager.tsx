"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TenantFeatureItem = {
  slug: string;
  label: string;
  order: number;
  /** When true, feature is always On and toggle is disabled (e.g. superadmin). */
  locked?: boolean;
  /** Indent level: 0 = root, 1 = child (one level indent), etc. */
  depth?: number;
  /** Parent feature slug; when set, this is a child. Used for parent-on/off and child-on auto-parent. */
  parentSlug?: string;
};

interface TenantFeaturesManagerProps {
  tenantId: string;
  features: TenantFeatureItem[];
  initialEnabledSlugs: string[];
  /** Slugs hidden from sidebar (Display OFF). When hidden, Gate is also OFF. */
  initialHiddenSlugs?: string[];
}

export function TenantFeaturesManager({
  tenantId,
  features,
  initialEnabledSlugs,
  initialHiddenSlugs = [],
}: TenantFeaturesManagerProps) {
  const [enabledSlugs, setEnabledSlugs] = useState<string[]>(initialEnabledSlugs);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>(initialHiddenSlugs);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabledSlugs(initialEnabledSlugs);
  }, [tenantId, initialEnabledSlugs]);

  useEffect(() => {
    setHiddenSlugs(initialHiddenSlugs);
  }, [tenantId, initialHiddenSlugs]);

  const getChildrenSlugs = (parentSlug: string) =>
    features.filter((f) => f.parentSlug === parentSlug).map((f) => f.slug);

  /** All descendant slugs (children, grandchildren, etc.) for a parent. Works for any depth. */
  const getAllDescendantSlugs = (parentSlug: string): string[] => {
    const direct = getChildrenSlugs(parentSlug);
    const nested = direct.flatMap((child) => getAllDescendantSlugs(child));
    return [...direct, ...nested];
  };

  /** All ancestor slugs (parent, grandparent, ... up to root) for a feature. Ensures full path is enabled. */
  const getAllAncestorSlugs = (childSlug: string): string[] => {
    const feature = features.find((f) => f.slug === childSlug);
    if (!feature?.parentSlug) return [];
    return [feature.parentSlug, ...getAllAncestorSlugs(feature.parentSlug)];
  };

  const toggleFeature = async (slug: string, checked: boolean) => {
    const feature = features.find((f) => f.slug === slug);
    const isParent = feature && !feature.parentSlug;
    const isChild = feature?.parentSlug;

    let next: string[];
    if (checked) {
      if (isChild && feature.parentSlug) {
        const ancestorSlugs = getAllAncestorSlugs(slug);
        next = [...new Set([...enabledSlugs, ...ancestorSlugs, slug])];
      } else if (isParent) {
        const descendantSlugs = getAllDescendantSlugs(slug);
        next = [...new Set([...enabledSlugs, slug, ...descendantSlugs])];
        // Sync Display ON for parent + descendants when turning Gate ON
        const nextHidden = hiddenSlugs.filter(
          (s) => s !== slug && !descendantSlugs.includes(s)
        );
        setEnabledSlugs(next);
        setHiddenSlugs(nextHidden);
        setSavingSlug(slug);
        setError(null);
        try {
          const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              featureSlugs: next,
              hiddenFeatureSlugs: nextHidden,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Failed to save");
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to save");
          setEnabledSlugs(enabledSlugs);
          setHiddenSlugs(hiddenSlugs);
        } finally {
          setSavingSlug(null);
        }
        return;
      } else {
        next = [...new Set([...enabledSlugs, slug])];
      }
    } else {
      if (isParent) {
        const descendantSlugs = getAllDescendantSlugs(slug);
        next = enabledSlugs.filter(
          (s) => s !== slug && !descendantSlugs.includes(s)
        );
      } else {
        next = enabledSlugs.filter((s) => s !== slug);
      }
    }

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

  /** Display ON = show in sidebar; Display OFF = hide from sidebar and turn Gate OFF (sync). */
  const toggleDisplay = async (slug: string, show: boolean) => {
    const feature = features.find((f) => f.slug === slug);
    const isParent = feature && !feature.parentSlug;

    let nextHidden: string[];
    let nextEnabled: string[] = enabledSlugs;

    if (show) {
      if (isParent) {
        const descendantSlugs = getAllDescendantSlugs(slug);
        nextHidden = hiddenSlugs.filter(
          (s) => s !== slug && !descendantSlugs.includes(s)
        );
      } else {
        nextHidden = hiddenSlugs.filter((s) => s !== slug);
      }
      setHiddenSlugs(nextHidden);
      setSavingSlug(slug);
      setError(null);
      try {
        const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featureSlugs: enabledSlugs,
            hiddenFeatureSlugs: nextHidden,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
        setHiddenSlugs(hiddenSlugs);
      } finally {
        setSavingSlug(null);
      }
      return;
    }

    // Display OFF: add to hidden and remove from enabled (sync Gate)
    if (isParent) {
      const descendantSlugs = getAllDescendantSlugs(slug);
      const toHide = [slug, ...descendantSlugs];
      nextHidden = [...new Set([...hiddenSlugs, ...toHide])];
      nextEnabled = enabledSlugs.filter((s) => !toHide.includes(s));
    } else {
      nextHidden = [...new Set([...hiddenSlugs, slug])];
      nextEnabled = enabledSlugs.filter((s) => s !== slug);
    }
    setEnabledSlugs(nextEnabled);
    setHiddenSlugs(nextHidden);
    setSavingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureSlugs: nextEnabled,
          hiddenFeatureSlugs: nextHidden,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setEnabledSlugs(enabledSlugs);
      setHiddenSlugs(hiddenSlugs);
    } finally {
      setSavingSlug(null);
    }
  };

  const isChecked = (slug: string, locked?: boolean) =>
    locked || enabledSlugs.includes(slug);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Features</CardTitle>
        <CardDescription>
          Maximum features for this site. Only checked items are available here; each role (in Roles) gets a subset of these. A user sees: this site&apos;s features ∩ their role&apos;s features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Toggle each feature on or off. Turning a parent on turns on all its children (you can then turn individual children off). Turning a parent off turns off all children. Turning a child on automatically turns its parent on so the parent shows correctly in the sidebar. Changes save automatically.
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="border rounded-md divide-y">
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 text-sm font-medium border-b">
              <div className="flex-1 min-w-0">Feature</div>
              <div className="flex items-center justify-end gap-2 shrink-0 w-[7rem]">
                Gate
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0 w-[7rem]">
                Display
              </div>
            </div>
            {features.map((feature) => {
              const locked = feature.locked === true;
              const depth = feature.depth ?? 0;
              const indentPx = depth * 20; // ~5 character indent per level
              return (
                <div
                  key={feature.slug}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors",
                    locked && "opacity-90"
                  )}
                  style={indentPx > 0 ? { paddingLeft: `${12 + indentPx}px` } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{feature.label}</span>
                    {locked && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (always on)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0 w-[7rem]">
                    {savingSlug === feature.slug && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={isChecked(feature.slug, locked)}
                      onCheckedChange={
                        locked
                          ? undefined
                          : (checked) => toggleFeature(feature.slug, checked)
                      }
                      disabled={savingSlug === feature.slug || locked}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0 w-[7rem]">
                    <Switch
                      checked={locked || !hiddenSlugs.includes(feature.slug)}
                      onCheckedChange={
                        locked
                          ? undefined
                          : (show) => toggleDisplay(feature.slug, show)
                      }
                      disabled={savingSlug === feature.slug || locked}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
