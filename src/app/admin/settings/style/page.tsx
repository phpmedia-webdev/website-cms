import { getDesignSystemConfig } from "@/lib/supabase/settings";
import { StyleSettingsContent } from "@/components/settings/StyleSettingsContent";

export default async function StyleSettingsPage() {
  const config = await getDesignSystemConfig();
  return <StyleSettingsContent initialConfig={config} />;
}
