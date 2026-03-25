import { EventFormClient } from "../EventFormClient";
import { getProjectById } from "@/lib/supabase/projects";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string; from?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project_id?.trim() || null;
  const initialProject = projectId ? await getProjectById(projectId) : null;
  const resolvedProjectId = initialProject?.id ?? null;
  const fromProject =
    String(params.from ?? "")
      .trim()
      .toLowerCase() === "project";

  return (
    <EventFormClient
      initialProjectId={resolvedProjectId}
      returnToProjectId={fromProject && resolvedProjectId ? resolvedProjectId : null}
    />
  );
}
