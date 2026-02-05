"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FontsSettings } from "@/components/settings/FontsSettings";
import { ColorsSettings } from "@/components/settings/ColorsSettings";
import type { DesignSystemConfig } from "@/types/design-system";

const TAB_FONTS = "fonts";
const TAB_COLORS = "colors";

interface StyleSettingsContentProps {
  initialConfig: DesignSystemConfig;
}

export function StyleSettingsContent({ initialConfig }: StyleSettingsContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === TAB_COLORS ? TAB_COLORS : TAB_FONTS;

  const [config, setConfig] = useState<DesignSystemConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setActiveTab(tabParam === TAB_COLORS ? TAB_COLORS : TAB_FONTS);
  }, [tabParam]);

  const setTab = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/design-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      window.location.reload();
    } catch (e) {
      console.error("Save failed:", e);
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [config]);

  const description =
    activeTab === TAB_FONTS
      ? "Configure primary and secondary fonts for your site."
      : "Configure color palette and design tokens.";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-11 w-full sm:w-auto">
            <TabsTrigger value={TAB_FONTS} className="flex-1 sm:flex-initial">
              Fonts
            </TabsTrigger>
            <TabsTrigger value={TAB_COLORS} className="flex-1 sm:flex-initial">
              Colors
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {activeTab === TAB_FONTS && (
        <FontsSettings
          config={config}
          onConfigChange={setConfig}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />
      )}
      {activeTab === TAB_COLORS && (
        <ColorsSettings
          config={config}
          onConfigChange={setConfig}
          onSave={handleSave}
          saving={saving}
          saved={saved}
        />
      )}
    </div>
  );
}
