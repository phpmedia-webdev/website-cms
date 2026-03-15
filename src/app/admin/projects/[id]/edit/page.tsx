import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/supabase/projects";
import { ProjectEditClient } from "./ProjectEditClient";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return <ProjectEditClient project={project} />;
}
