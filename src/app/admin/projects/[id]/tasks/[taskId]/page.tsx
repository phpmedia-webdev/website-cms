import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProjectById,
  getTaskById,
  getTaskFollowers,
  listTaskTimeLogs,
  formatMinutesAsHoursMinutes,
} from "@/lib/supabase/projects";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import { taskTermForSlug } from "@/lib/tasks/merge-task-customizer-colors";
import { getNotesByConversationUid, taskConversationUid } from "@/lib/supabase/crm";
import { getContactById } from "@/lib/supabase/crm";
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskThreadSection } from "@/components/crm/TaskThreadSection";
import { TaskFollowersSection, type TaskFollowerWithLabel } from "@/components/crm/TaskFollowersSection";
import { TaskTimeLogsSection } from "@/components/crm/TaskTimeLogsSection";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import {
  ADMIN_TASKS_LIST_PATH,
  parseTaskDetailFrom,
  taskDetailQuery,
  type TaskDetailFrom,
} from "@/lib/tasks/task-detail-nav";

function contactDisplayName(c: { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }): string {
  if (c.full_name?.trim()) return c.full_name.trim();
  const first = c.first_name?.trim() ?? "";
  const last = c.last_name?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ");
  return name || c.email || "Contact";
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: projectId, taskId } = await params;
  const sp = await searchParams;
  const from: TaskDetailFrom = parseTaskDetailFrom(sp);
  const [
    project,
    task,
    notes,
    followers,
    timeLogs,
    czTaskType,
    czTaskStatus,
    czTaskPhase,
  ] = await Promise.all([
    getProjectById(projectId),
    getTaskById(taskId),
    getNotesByConversationUid(taskConversationUid(taskId)),
    getTaskFollowers(taskId),
    listTaskTimeLogs(taskId),
    getCustomizerOptions("task_type"),
    getCustomizerOptions("task_status"),
    getCustomizerOptions("task_phase"),
  ]);
  if (!project || !task || task.project_id !== projectId) notFound();

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const typeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  const statusTerm = statusTerms.find((t) => t.id === task.task_status_slug) ?? null;
  const typeTerm = typeTerms.find((t) => t.id === task.task_type_slug) ?? null;
  const phaseTerm = taskTermForSlug(taskPhaseTerms, task.task_phase_slug ?? null);

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

  const backHref =
    from === "project" ? `/admin/projects/${projectId}` : ADMIN_TASKS_LIST_PATH;
  const backLabel =
    from === "project" ? `← Back to ${project.name}` : "← Back to all tasks";
  const fromQuery = taskDetailQuery(from);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href={`/admin/projects/${projectId}/tasks/${taskId}/edit${fromQuery}`}>
            Edit task
          </Link>
        </Button>
      </div>

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
            <dd>
              <TermBadge term={statusTerm} />
            </dd>
            <dt className="text-muted-foreground">Phase</dt>
            <dd>
              <TermBadge term={phaseTerm} />
            </dd>
            <dt className="text-muted-foreground">Start date</dt>
            <dd>{formatDate(task.start_date)}</dd>
            <dt className="text-muted-foreground">Due date</dt>
            <dd>{formatDate(task.due_date)}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd>
              <TermBadge term={typeTerm} />
            </dd>
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
        </CardContent>
      </Card>

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
