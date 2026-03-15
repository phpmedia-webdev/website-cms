import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectById } from "@/lib/supabase/projects";
import { listTasks } from "@/lib/supabase/projects";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const tasks = await listTasks({ project_id: id });

  return (
    <ProjectDetailClient
      project={project}
      initialTasks={tasks}
    />
  );
}
