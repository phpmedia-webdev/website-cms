import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/supabase/projects";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import { TaskNewClient } from "./TaskNewClient";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const [project, czTaskStatus, czTaskType, czTaskPhase] = await Promise.all([
    getProjectById(projectId),
    getCustomizerOptions("task_status"),
    getCustomizerOptions("task_type"),
    getCustomizerOptions("task_phase"),
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
