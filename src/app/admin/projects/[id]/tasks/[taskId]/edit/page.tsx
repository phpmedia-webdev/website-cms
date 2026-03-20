import { notFound } from "next/navigation";
import { getProjectById, getTaskById } from "@/lib/supabase/projects";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import { TaskEditClient } from "./TaskEditClient";
import { parseTaskDetailFrom } from "@/lib/tasks/task-detail-nav";

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
  const [project, task, czTaskType, czTaskStatus, czTaskPhase] = await Promise.all([
    getProjectById(projectId),
    getTaskById(taskId),
    getCustomizerOptions("task_type"),
    getCustomizerOptions("task_status"),
    getCustomizerOptions("task_phase"),
  ]);
  if (!project || !task || task.project_id !== projectId) notFound();

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  return (
    <TaskEditClient
      projectId={projectId}
      projectName={project.name}
      task={task}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
      taskPhaseTerms={taskPhaseTerms}
      taskDetailFrom={taskDetailFrom}
    />
  );
}
