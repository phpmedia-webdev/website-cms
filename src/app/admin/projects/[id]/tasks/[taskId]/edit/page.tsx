import { notFound, redirect } from "next/navigation";
import {
  getProjectById,
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
import { TaskEditClient } from "./TaskEditClient";
import { parseTaskDetailFrom, taskEditPath } from "@/lib/tasks/task-detail-nav";

export default async function TaskEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: projectId, taskId } = await params;
  const sp = await searchParams;
  const taskDetailFrom = parseTaskDetailFrom(sp);
  const schema = getClientSchema();

  const task = await getTaskById(taskId);
  if (!task) notFound();
  const canonicalPid = task.project_id?.trim() ?? "";
  if (canonicalPid !== projectId) {
    redirect(taskEditPath(taskId, task.project_id, taskDetailFrom));
  }

  const [project, followers, timeLogs, notes, czTaskType, czTaskStatus, czTaskPhase, allProjects] =
    await Promise.all([
      getProjectById(projectId),
      getTaskFollowers(taskId),
      listTaskTimeLogs(taskId),
      getNotesByConversationUid(taskConversationUid(taskId)),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_TYPE),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_STATUS),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_PHASE),
      listProjects({ include_archived: false }, schema),
    ]);
  if (!project) notFound();

  const projectRowById = new Map<string, { id: string; name: string }>();
  for (const p of allProjects) projectRowById.set(p.id, { id: p.id, name: p.name });
  projectRowById.set(project.id, { id: project.id, name: project.name });
  const projectsForPicker = [...projectRowById.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

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

  const authorIds = [...new Set(notes.map((n) => n.author_id).filter(Boolean))] as string[];
  const authorLabels: Record<string, string> = {};
  await Promise.all(
    authorIds.map(async (id) => {
      authorLabels[id] = await getDisplayLabelForUser(id);
    })
  );

  let taskLinkedContact: { id: string; label: string } | null = null;
  if (task.contact_id) {
    const c = await getContactById(task.contact_id);
    if (c) taskLinkedContact = { id: c.id, label: formatCrmContactDisplayName(c) };
  }

  return (
    <TaskEditClient
      projectName={project.name}
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
      initialNotes={notes}
      authorLabels={authorLabels}
    />
  );
}
