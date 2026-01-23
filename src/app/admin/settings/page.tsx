import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { getDesignSystemConfig } from "@/lib/supabase/settings";

export default async function SettingsPage() {
  // Load current design system config
  const designSystemConfig = await getDesignSystemConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your CMS settings and preferences
        </p>
      </div>

      <SettingsTabs initialConfig={designSystemConfig} />
    </div>
  );
}
