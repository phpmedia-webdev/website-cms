import { getCrmNoteTypes, getCrmContactStatuses } from "@/lib/supabase/settings";
import { CustomizerSettingsContent } from "@/components/settings/CustomizerSettingsContent";

export default async function CustomizerSettingsPage() {
  const [noteTypes, contactStatuses] = await Promise.all([
    getCrmNoteTypes(),
    getCrmContactStatuses(),
  ]);

  return (
    <CustomizerSettingsContent
      initialNoteTypes={noteTypes}
      initialContactStatuses={contactStatuses}
    />
  );
}
