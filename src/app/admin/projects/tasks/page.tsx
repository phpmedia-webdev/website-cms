import { listProjects, listProjectMembersByProjectIds, getProjectStatusTerms } from "@/lib/supabase/projects";
import { getContactsByIds } from "@/lib/supabase/crm";
import { getProfilesByUserIds } from "@/lib/supabase/profiles";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import {
  filterActiveProjectsForTaskList,
  getAdminTasksListBundle,
  resolveAssigneeLabelsForUserIds,
  type AdminTasksListBundle,
} from "@/lib/tasks/admin-task-list";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { TASK_STATUS_SLUG_COMPLETED } from "@/lib/tasks/task-status-reserved";
import { AllTasksListClient } from "./AllTasksListClient";

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

const EMPTY_BUNDLE: AdminTasksListBundle = {
  tasks: [],
  phaseSlugByTaskId: {},
  taskAssigneesMap: {},
  taskTimeLogTotals: {},
};

export default async function AdminAllTasksPage() {
  const user = await getCurrentUser();

  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let bundle = EMPTY_BUNDLE;
  let czTaskType: Awaited<ReturnType<typeof getCustomizerOptions>> = [];
  let czTaskStatus: Awaited<ReturnType<typeof getCustomizerOptions>> = [];
  let czTaskPhase: Awaited<ReturnType<typeof getCustomizerOptions>> = [];
  let projectStatusTerms: Awaited<ReturnType<typeof getProjectStatusTerms>> = [];
  try {
    [projects, bundle, czTaskType, czTaskStatus, czTaskPhase, projectStatusTerms] = await Promise.all([
      listProjects({ include_archived: true }),
      getAdminTasksListBundle({
        exclude_status_slugs: [TASK_STATUS_SLUG_COMPLETED],
      }),
      getCustomizerOptions("task_type"),
      getCustomizerOptions("task_status"),
      getCustomizerOptions("task_phase"),
      getProjectStatusTerms(),
    ]);
  } catch (err) {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const msg =
      err instanceof Error
        ? err.message
        : typeof e?.message === "string"
          ? e.message
          : JSON.stringify(err);
    console.error("Error loading tasks:", msg, e?.details ?? "", e?.hint ?? "", e?.code ?? "");
  }

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  const { tasks, phaseSlugByTaskId, taskAssigneesMap, taskTimeLogTotals } = bundle;

  const projectStatusSlugById = Object.fromEntries(
    projectStatusTerms.map((t) => [t.id, t.slug])
  );
  const pickerProjects = filterActiveProjectsForTaskList(projects, projectStatusSlugById);

  const pickerProjectIds = pickerProjects.map((p) => p.id);
  const assigneeMemberRows =
    pickerProjectIds.length > 0
      ? await listProjectMembersByProjectIds(pickerProjectIds)
      : [];
  const assigneeUserIds = uniqueStrings(assigneeMemberRows.map((m) => m.user_id));
  const assigneeContactIds = uniqueStrings(assigneeMemberRows.map((m) => m.contact_id));
  const [assigneeProfiles, assigneeContacts, assigneeUserLabels] = await Promise.all([
    getProfilesByUserIds(assigneeUserIds),
    assigneeContactIds.length > 0 ? getContactsByIds(assigneeContactIds) : Promise.resolve([]),
    resolveAssigneeLabelsForUserIds(assigneeUserIds),
  ]);
  const assigneeProfileByUserId = new Map(assigneeProfiles.map((p) => [p.user_id, p]));
  const assigneeUserDisplay: Record<string, { label: string; avatarUrl: string | null }> = {};
  for (const uid of assigneeUserIds) {
    const p = assigneeProfileByUserId.get(uid);
    assigneeUserDisplay[uid] = {
      label: assigneeUserLabels.get(uid) ?? "User",
      avatarUrl: p?.avatar_url ?? null,
    };
  }
  const assigneeContactDisplay: Record<string, { label: string; avatarUrl: string | null }> = {};
  for (const c of assigneeContacts) {
    assigneeContactDisplay[c.id] = {
      label: (c.full_name?.trim() || c.email?.trim() || c.id).trim(),
      avatarUrl: c.avatar_url ?? null,
    };
  }

  const taskPhaseOptions = czTaskPhase
    .filter((r) => String(r.slug ?? "").trim().length > 0)
    .map((r) => ({
      slug: String(r.slug).trim(),
      label: (String(r.label ?? r.slug).trim() || String(r.slug).trim()),
      color: r.color != null && String(r.color).trim() ? String(r.color).trim() : null,
    }));

  const taskTypeOptions = czTaskType
    .filter((r) => String(r.slug ?? "").trim().length > 0)
    .map((r) => ({
      slug: String(r.slug).trim(),
      label: (String(r.label ?? r.slug).trim() || String(r.slug).trim()),
      color: r.color != null && String(r.color).trim() ? String(r.color).trim() : null,
    }));

  const taskStatusOptions = czTaskStatus
    .filter((r) => String(r.slug ?? "").trim().length > 0)
    .map((r) => ({
      slug: String(r.slug).trim(),
      label: (String(r.label ?? r.slug).trim() || String(r.slug).trim()),
      color: r.color != null && String(r.color).trim() ? String(r.color).trim() : null,
    }));

  return (
    <AllTasksListClient
      initialProjects={projects}
      pickerProjects={pickerProjects}
      assigneeMemberRows={assigneeMemberRows.map((m) => ({
        project_id: m.project_id,
        user_id: m.user_id,
        contact_id: m.contact_id,
      }))}
      assigneeUserDisplay={assigneeUserDisplay}
      assigneeContactDisplay={assigneeContactDisplay}
      taskPhaseOptions={taskPhaseOptions}
      taskTypeOptions={taskTypeOptions}
      taskStatusOptions={taskStatusOptions}
      initialTasks={tasks}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
      taskPhaseTerms={taskPhaseTerms}
      initialPhaseSlugByTaskId={phaseSlugByTaskId}
      taskAssigneesMap={taskAssigneesMap}
      taskTimeLogTotals={taskTimeLogTotals}
      currentUserId={user?.id ?? ""}
    />
  );
}
