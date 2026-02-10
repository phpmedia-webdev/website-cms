import {
  getCrmNoteTypes,
  getCrmContactStatuses,
  getCalendarResourceTypes,
} from "@/lib/supabase/settings";
import { CustomizerSettingsContent } from "@/components/settings/CustomizerSettingsContent";

export default async function CustomizerSettingsPage() {
  const [noteTypes, contactStatuses, resourceTypes] = await Promise.all([
    getCrmNoteTypes(),
    getCrmContactStatuses(),
    getCalendarResourceTypes(),
  ]);

  return (
    <CustomizerSettingsContent
      initialNoteTypes={noteTypes}
      initialContactStatuses={contactStatuses}
      initialResourceTypes={resourceTypes}
    />
  );
}
