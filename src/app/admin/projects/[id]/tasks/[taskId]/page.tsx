import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProjectById,
  getTaskById,
  getTaskFollowers,
  listTaskTimeLogs,
  getTaskPriorityTerms,
  getTaskStatusTerms,
  getTaskTypeTerms,
  formatMinutesAsHoursMinutes,
} from "@/lib/supabase/projects";
import { getTaxonomyTermsForContentDisplay } from "@/lib/supabase/taxonomy";
import { getNotesByConversationUid, taskConversationUid } from "@/lib/supabase/crm";
import { getContactById } from "@/lib/supabase/crm";
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskThreadSection } from "@/components/crm/TaskThreadSection";
import { TaskFollowersSection, type TaskFollowerWithLabel } from "@/components/crm/TaskFollowersSection";
import { TaskTimeLogsSection } from "@/components/crm/TaskTimeLogsSection";
import { TaskDetailTaxonomyCard } from "./TaskDetailTaxonomyCard";
import { TaxonomyChips } from "@/components/taxonomy/TaxonomyChips";
import { TermBadge } from "@/components/taxonomy/TermBadge";

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
  const [project, task, notes, followers, timeLogs, priorityTerms, taskTaxonomy, statusTerms, typeTerms] =
    await Promise.all([
      getProjectById(projectId),
      getTaskById(taskId),
      getNotesByConversationUid(taskConversationUid(taskId)),
      getTaskFollowers(taskId),
      listTaskTimeLogs(taskId),
      getTaskPriorityTerms(),
      getTaxonomyTermsForContentDisplay(taskId, "task"),
      getTaskStatusTerms(),
      getTaskTypeTerms(),
    ]);
  if (!project || !task || task.project_id !== projectId) notFound();

  const priorityByTermId = Object.fromEntries(priorityTerms.map((t) => [t.id, t]));
  const priorityLabel = priorityByTermId[task.priority_term_id]?.name ?? "—";
  const statusTerm = statusTerms.find((t) => t.id === task.status_term_id) ?? null;
  const typeTerm = typeTerms.find((t) => t.id === task.task_type_term_id) ?? null;

  const taskTimeLogTotalMinutes = timeLogs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);

  const timeLogUserIds = [...new Set(timeLogs.map((l) => l.user_id).filter(Boolean))] as string[];
  const timeLogContactIds = [...new Set(timeLogs.map((l) => l.contact_id).filter(Boolean))] as string[];
  const timeLogUserLabels: Record<string, string> = {};
  const timeLogContactLabels: Record<string, string> = {};
  await Promise.all([
    ...timeLogUserIds.map(async (id) => {
      timeLogUserLabels[id] = await getDisplayLabelForUser(id);
    }),
    ...timeLogContactIds.map(async (id) => {
      const c = await getContactById(id);
      timeLogContactLabels[id] = c ? contactDisplayName(c) : "Contact";
    }),
  ]);

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
            <dd><TermBadge term={statusTerm} /></dd>
            <dt className="text-muted-foreground">Priority</dt>
            <dd><TermBadge term={priorityByTermId[task.priority_term_id] ?? null} /></dd>
            <dt className="text-muted-foreground">Start date</dt>
            <dd>{formatDate(task.start_date)}</dd>
            <dt className="text-muted-foreground">Due date</dt>
            <dd>{formatDate(task.due_date)}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd><TermBadge term={typeTerm} /></dd>
            <dt className="text-muted-foreground">Estimated time</dt>
            <dd>{formatMinutesAsHoursMinutes(task.proposed_time)}</dd>
            {task.actual_time != null && (
              <>
                <dt className="text-muted-foreground">Actual time</dt>
                <dd>{formatMinutesAsHoursMinutes(task.actual_time)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Total time spent</dt>
            <dd>{formatMinutesAsHoursMinutes(taskTimeLogTotalMinutes)}</dd>
          </dl>
          {(taskTaxonomy.categories.length > 0 || taskTaxonomy.tags.length > 0) && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground mr-2">Categories & tags:</span>
              <TaxonomyChips categories={taskTaxonomy.categories} tags={taskTaxonomy.tags} />
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailTaxonomyCard taskId={taskId} taskTaxonomy={taskTaxonomy} />

      <TaskFollowersSection
        taskId={taskId}
        initialFollowers={followersWithLabels}
        projectId={projectId}
      />

      <TaskTimeLogsSection
        taskId={taskId}
        initialLogs={timeLogs}
        userLabels={timeLogUserLabels}
        contactLabels={timeLogContactLabels}
      />

      <TaskThreadSection
        taskId={taskId}
        initialNotes={notes}
        authorLabels={authorLabels}
      />
    </div>
  );
}
