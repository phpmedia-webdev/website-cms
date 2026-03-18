import { EventFormClient } from "../EventFormClient";
import { getProjectById } from "@/lib/supabase/projects";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project_id?.trim() || null;
  const initialProject = projectId ? await getProjectById(projectId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New event</h1>
        <p className="text-muted-foreground mt-2">
          {initialProject
            ? `Project is pre-filled from ${initialProject.name}.`
            : "Create a calendar event and link it to a project if needed."}
        </p>
      </div>
      <EventFormClient initialProjectId={initialProject?.id ?? null} />
    </div>
  );
}
