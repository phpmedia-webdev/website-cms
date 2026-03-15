import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/supabase/projects";
import { TaskNewClient } from "./TaskNewClient";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  return <TaskNewClient projectId={projectId} projectName={project.name} />;
}
