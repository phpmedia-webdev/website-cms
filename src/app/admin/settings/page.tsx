import { GeneralSettingsContent } from "@/components/settings/GeneralSettingsContent";

/**
 * /admin/settings shows General (default). No redirect — avoids loading issues.
 */
export default function SettingsPage() {
  return <GeneralSettingsContent />;
}
