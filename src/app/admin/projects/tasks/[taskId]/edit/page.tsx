import { notFound, redirect } from "next/navigation";
import {
  getTaskById,
  getTaskFollowers,
  listProjects,
  listTaskTimeLogs,
} from "@/lib/supabase/projects";
import { getClientSchema } from "@/lib/supabase/schema";
import { resolveTaskFollowersWithLabels } from "@/lib/tasks/resolve-task-followers-with-labels";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import {
  CUSTOMIZER_SCOPE_TASK_PHASE,
  CUSTOMIZER_SCOPE_TASK_STATUS,
  CUSTOMIZER_SCOPE_TASK_TYPE,
  statusTermsFromCustomizerRows,
} from "@/lib/tasks/customizer-task-terms";
import {
  getNotesByConversationUid,
  taskConversationUid,
  getContactById,
  formatCrmContactDisplayName,
} from "@/lib/supabase/crm";
import { getDisplayLabelForUser, getRealNameLabelForUser } from "@/lib/blog-comments/author-name";
import { resolveTaskPageAvatarMaps } from "@/lib/tasks/task-page-avatar-maps";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import { TaskEditClient } from "@/app/admin/projects/[id]/tasks/[taskId]/edit/TaskEditClient";
import { parseTaskDetailFrom, taskEditPath } from "@/lib/tasks/task-detail-nav";

const NO_PROJECT_LABEL = "No project";

/**
 * Edit task when `tasks.project_id` is NULL — URL has no project segment.
 */
export default async function TaskEditUnassignedPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { taskId } = await params;
  const sp = await searchParams;
  const taskDetailFrom = parseTaskDetailFrom(sp);
  const schema = getClientSchema();

  const task = await getTaskById(taskId);
  if (!task) notFound();
  if (task.project_id?.trim()) {
    redirect(taskEditPath(taskId, task.project_id, taskDetailFrom));
  }

  const [followers, timeLogs, notes, czTaskType, czTaskStatus, czTaskPhase, allProjects] =
    await Promise.all([
      getTaskFollowers(taskId),
      listTaskTimeLogs(taskId),
      getNotesByConversationUid(taskConversationUid(taskId)),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_TYPE),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_STATUS),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_PHASE),
      listProjects({ include_archived: false }, schema),
    ]);

  const projectsForPicker = [...allProjects]
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const assigneesWithLabels = await resolveTaskFollowersWithLabels(followers);
  const assigneesOnly = assigneesWithLabels.filter((f) => f.role !== "creator");
  const creatorFollower = assigneesWithLabels.find((f) => f.role === "creator");
  const creatorName = creatorFollower?.user_id
    ? await getRealNameLabelForUser(creatorFollower.user_id)
    : creatorFollower?.label ?? (task.creator_id ? await getRealNameLabelForUser(task.creator_id) : null);
  const createdOn = new Date(task.created_at).toLocaleDateString();
  const createdByLine = creatorName
    ? `Created by ${creatorName} on ${createdOn}`
    : `Created on ${createdOn}`;

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  const timeLogUserIds = [...new Set(timeLogs.map((l) => l.user_id).filter(Boolean))] as string[];
  const timeLogContactIds = [...new Set(timeLogs.map((l) => l.contact_id).filter(Boolean))] as string[];
  const authorIds = [...new Set(notes.map((n) => n.author_id).filter(Boolean))] as string[];

  const timeLogUserLabels: Record<string, string> = {};
  const timeLogContactLabels: Record<string, string> = {};
  await Promise.all([
    ...timeLogUserIds.map(async (id) => {
      timeLogUserLabels[id] = await getRealNameLabelForUser(id);
    }),
    ...timeLogContactIds.map(async (id) => {
      const c = await getContactById(id);
      timeLogContactLabels[id] = c ? formatCrmContactDisplayName(c) : "Contact";
    }),
  ]);

  const authorLabels: Record<string, string> = {};
  await Promise.all(
    authorIds.map(async (id) => {
      authorLabels[id] = await getDisplayLabelForUser(id);
    })
  );

  const { timeLogUserInitials, timeLogContactInitials, authorAvatarInitials } =
    await resolveTaskPageAvatarMaps({
      timeLogUserIds,
      timeLogContactIds,
      noteAuthorUserIds: authorIds,
    });

  let taskLinkedContact: {
    id: string;
    label: string;
    avatar_initials?: string;
  } | null = null;
  if (task.contact_id) {
    const c = await getContactById(task.contact_id);
    if (c)
      taskLinkedContact = {
        id: c.id,
        label: formatCrmContactDisplayName(c),
        avatar_initials: initialsFromFirstLast(c.first_name, c.last_name, c.email),
      };
  }

  return (
    <TaskEditClient
      projectName={NO_PROJECT_LABEL}
      projectsForPicker={projectsForPicker}
      task={task}
      assignees={assigneesOnly}
      createdByLine={createdByLine}
      taskLinkedContact={taskLinkedContact}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
      taskPhaseTerms={taskPhaseTerms}
      taskDetailFrom={taskDetailFrom}
      initialTimeLogs={timeLogs}
      timeLogUserLabels={timeLogUserLabels}
      timeLogContactLabels={timeLogContactLabels}
      timeLogUserInitialsById={timeLogUserInitials}
      timeLogContactInitialsById={timeLogContactInitials}
      initialNotes={notes}
      authorLabels={authorLabels}
      authorAvatarInitials={authorAvatarInitials}
    />
  );
}
