import { getDesignSystemConfig } from "@/lib/supabase/settings";
import { FontsSettingsPageClient } from "@/components/settings/FontsSettingsPageClient";

export default async function FontsSettingsPage() {
  const config = await getDesignSystemConfig();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fonts</h1>
        <p className="text-muted-foreground mt-2">
          Configure primary and secondary fonts for your site
        </p>
      </div>
      <FontsSettingsPageClient initialConfig={config} />
    </div>
  );
}
