import { getDesignSystemConfig } from "@/lib/supabase/settings";
import { ColorsSettingsPageClient } from "@/components/settings/ColorsSettingsPageClient";

export default async function ColorsSettingsPage() {
  const config = await getDesignSystemConfig();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Colors</h1>
        <p className="text-muted-foreground mt-2">
          Configure color palette and design tokens
        </p>
      </div>
      <ColorsSettingsPageClient initialConfig={config} />
    </div>
  );
}
