import { notFound } from "next/navigation";
import {
  getProjectById,
  getTaskById,
  getTaskFollowers,
  listTaskTimeLogs,
} from "@/lib/supabase/projects";
import { resolveTaskFollowersWithLabels } from "@/lib/tasks/resolve-task-followers-with-labels";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import { getNotesByConversationUid, taskConversationUid, getContactById } from "@/lib/supabase/crm";
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import { TaskEditClient } from "./TaskEditClient";
import { parseTaskDetailFrom } from "@/lib/tasks/task-detail-nav";

function contactDisplayName(c: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
  if (c.full_name?.trim()) return c.full_name.trim();
  const first = c.first_name?.trim() ?? "";
  const last = c.last_name?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ");
  return name || c.email || "Contact";
}

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
  const [project, task, followers, timeLogs, notes, czTaskType, czTaskStatus, czTaskPhase] =
    await Promise.all([
      getProjectById(projectId),
      getTaskById(taskId),
      getTaskFollowers(taskId),
      listTaskTimeLogs(taskId),
      getNotesByConversationUid(taskConversationUid(taskId)),
      getCustomizerOptions("task_type"),
      getCustomizerOptions("task_status"),
      getCustomizerOptions("task_phase"),
    ]);
  if (!project || !task || task.project_id !== projectId) notFound();

  const assigneesWithLabels = await resolveTaskFollowersWithLabels(followers);

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  const timeLogUserIds = [...new Set(timeLogs.map((l) => l.user_id).filter(Boolean))] as string[];
  const timeLogContactIds = [...new Set(timeLogs.map((l) => l.contact_id).filter(Boolean))] as string[];
  const timeLogUserLabels: Record<string, string> = {};
  const timeLogContactLabels: Record<string, string> = {};
  await Promise.all([
    ...timeLogUserIds.map(async (id) => {
      timeLogUserLabels[id] = await getDisplayLabelForUser(id);
    }),
    ...timeLogContactIds.map(async (id) => {
      const c = await getContactById(id);
      timeLogContactLabels[id] = c ? contactDisplayName(c) : "Contact";
    }),
  ]);

  const authorIds = [...new Set(notes.map((n) => n.author_id).filter(Boolean))] as string[];
  const authorLabels: Record<string, string> = {};
  await Promise.all(
    authorIds.map(async (id) => {
      authorLabels[id] = await getDisplayLabelForUser(id);
    })
  );

  return (
    <TaskEditClient
      projectId={projectId}
      projectName={project.name}
      task={task}
      assignees={assigneesWithLabels}
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
