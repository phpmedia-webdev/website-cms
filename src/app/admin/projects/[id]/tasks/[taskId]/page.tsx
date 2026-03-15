import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectById } from "@/lib/supabase/projects";
import { getTaskById } from "@/lib/supabase/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const [project, task] = await Promise.all([
    getProjectById(projectId),
    getTaskById(taskId),
  ]);
  if (!project || !task || task.project_id !== projectId) notFound();

  function formatDate(s: string | null): string {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString();
    } catch {
      return "—";
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/projects/${projectId}`}>
          ← Back to {project.name}
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-6">
          <h1 className="text-xl font-semibold">{task.title}</h1>
          {task.description && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{task.status.replace("_", " ")}</dd>
            <dt className="text-muted-foreground">Priority</dt>
            <dd className="capitalize">{task.priority}</dd>
            <dt className="text-muted-foreground">Due date</dt>
            <dd>{formatDate(task.due_date)}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="capitalize">{task.task_type.replace("_", " ")}</dd>
            {task.proposed_time != null && (
              <>
                <dt className="text-muted-foreground">Proposed time (min)</dt>
                <dd>{task.proposed_time}</dd>
              </>
            )}
            {task.actual_time != null && (
              <>
                <dt className="text-muted-foreground">Actual time (min)</dt>
                <dd>{task.actual_time}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
