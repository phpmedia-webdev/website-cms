import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectById, getTaskById, getTaskFollowers } from "@/lib/supabase/projects";
import { getNotesByConversationUid, taskConversationUid } from "@/lib/supabase/crm";
import { getContactById } from "@/lib/supabase/crm";
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskThreadSection } from "@/components/crm/TaskThreadSection";
import { TaskFollowersSection, type TaskFollowerWithLabel } from "@/components/crm/TaskFollowersSection";

function contactDisplayName(c: { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }): string {
  if (c.full_name?.trim()) return c.full_name.trim();
  const first = c.first_name?.trim() ?? "";
  const last = c.last_name?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ");
  return name || c.email || "Contact";
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const [project, task, notes, followers] = await Promise.all([
    getProjectById(projectId),
    getTaskById(taskId),
    getNotesByConversationUid(taskConversationUid(taskId)),
    getTaskFollowers(taskId),
  ]);
  if (!project || !task || task.project_id !== projectId) notFound();

  const authorIds = [...new Set(notes.map((n) => n.author_id).filter(Boolean))] as string[];
  const authorLabels: Record<string, string> = {};
  await Promise.all(
    authorIds.map(async (id) => {
      authorLabels[id] = await getDisplayLabelForUser(id);
    })
  );

  const followersWithLabels: TaskFollowerWithLabel[] = await Promise.all(
    followers.map(async (f) => {
      if (f.contact_id) {
        const contact = await getContactById(f.contact_id);
        return { ...f, label: contact ? contactDisplayName(contact) : "Contact" };
      }
      if (f.user_id) {
        const label = await getDisplayLabelForUser(f.user_id);
        return { ...f, label };
      }
      return { ...f, label: "—" };
    })
  );

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
            <dt className="text-muted-foreground">Start date</dt>
            <dd>{formatDate(task.start_date)}</dd>
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

      <TaskFollowersSection
        taskId={taskId}
        initialFollowers={followersWithLabels}
      />

      <TaskThreadSection
        taskId={taskId}
        initialNotes={notes}
        authorLabels={authorLabels}
      />
    </div>
  );
}
