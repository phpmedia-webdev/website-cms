"use client";

import { useState } from "react";
import { FontsSettings } from "./FontsSettings";
import type { DesignSystemConfig } from "@/types/design-system";

interface FontsSettingsPageClientProps {
  initialConfig: DesignSystemConfig;
}

export function FontsSettingsPageClient({ initialConfig }: FontsSettingsPageClientProps) {
  const [config, setConfig] = useState<DesignSystemConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
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
  };

  return (
    <FontsSettings
      config={config}
      onConfigChange={setConfig}
      onSave={handleSave}
      saving={saving}
      saved={saved}
    />
  );
}
