import { getCrmNoteTypes } from "@/lib/supabase/settings";
import { CrmSettingsClient } from "./CrmSettingsClient";

export default async function CrmSettingsPage() {
  const noteTypes = await getCrmNoteTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure CRM-related settings
        </p>
      </div>
      <CrmSettingsClient initialNoteTypes={noteTypes} />
    </div>
  );
}
