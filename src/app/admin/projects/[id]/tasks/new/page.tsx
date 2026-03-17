import { notFound } from "next/navigation";
import {
  getProjectById,
  getTaskPriorityTerms,
  getTaskStatusTerms,
  getTaskTypeTerms,
} from "@/lib/supabase/projects";
import { TaskNewClient } from "./TaskNewClient";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const [project, priorityTerms, statusTerms, taskTypeTerms] = await Promise.all([
    getProjectById(projectId),
    getTaskPriorityTerms(),
    getTaskStatusTerms(),
    getTaskTypeTerms(),
  ]);
  if (!project) notFound();

  return (
    <TaskNewClient
      projectId={projectId}
      projectName={project.name}
      priorityTerms={priorityTerms}
      statusTerms={statusTerms}
      taskTypeTerms={taskTypeTerms}
    />
  );
}
