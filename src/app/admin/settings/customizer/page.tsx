import { getRoleForCurrentUser, isSuperadminFromRole } from "@/lib/auth/resolve-role";
import {
  getCrmNoteTypes,
  getCrmContactStatuses,
  getCustomizerOptions,
} from "@/lib/supabase/settings";
import { CustomizerSettingsContent } from "@/components/settings/CustomizerSettingsContent";

export default async function CustomizerSettingsPage() {
  const [
    role,
    noteTypes,
    contactStatuses,
    resourceTypeOptions,
    projectTypes,
    projectStatuses,
    projectRoles,
    taskTypes,
    taskStatuses,
    taskPhases,
    eventTypes,
  ] = await Promise.all([
    getRoleForCurrentUser(),
    getCrmNoteTypes(),
    getCrmContactStatuses(),
    getCustomizerOptions("resource_type"),
    getCustomizerOptions("project_type"),
    getCustomizerOptions("project_status"),
    getCustomizerOptions("project_role"),
    getCustomizerOptions("task_type"),
    getCustomizerOptions("task_status"),
    getCustomizerOptions("task_phase"),
    getCustomizerOptions("event_type"),
  ]);
  const isSuperadmin = isSuperadminFromRole(role);

  return (
    <CustomizerSettingsContent
      isSuperadmin={isSuperadmin}
      initialNoteTypes={noteTypes}
      initialContactStatuses={contactStatuses}
      initialResourceTypes={resourceTypeOptions}
      initialProjectTypes={projectTypes}
      initialProjectStatuses={projectStatuses}
      initialProjectRoles={projectRoles}
      initialTaskTypes={taskTypes}
      initialTaskStatuses={taskStatuses}
      initialTaskPhases={taskPhases}
      initialEventTypes={eventTypes}
    />
  );
}
