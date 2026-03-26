import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/supabase/projects";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import {
  CUSTOMIZER_SCOPE_TASK_PHASE,
  CUSTOMIZER_SCOPE_TASK_STATUS,
  CUSTOMIZER_SCOPE_TASK_TYPE,
  statusTermsFromCustomizerRows,
} from "@/lib/tasks/customizer-task-terms";
import { TaskNewClient } from "./TaskNewClient";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const [project, czTaskStatus, czTaskType, czTaskPhase] = await Promise.all([
    getProjectById(projectId),
    getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_STATUS),
    getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_TYPE),
    getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_PHASE),
  ]);
  if (!project) notFound();

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const taskTypeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  return (
    <TaskNewClient
      projectId={projectId}
      projectName={project.name}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
      taskPhaseTerms={taskPhaseTerms}
    />
  );
}
