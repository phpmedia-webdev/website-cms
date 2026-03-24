import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, LayoutGrid, Paperclip } from "lucide-react";
import {
  getProjectById,
  getTaskById,
  getTaskFollowers,
  listTaskTimeLogs,
} from "@/lib/supabase/projects";
import { resolveTaskFollowersWithLabels } from "@/lib/tasks/resolve-task-followers-with-labels";
import { getCustomizerOptions } from "@/lib/supabase/settings";
import { statusTermsFromCustomizerRows } from "@/lib/tasks/customizer-task-terms";
import { taskTermForSlug } from "@/lib/tasks/merge-task-customizer-colors";
import { getNotesByConversationUid, taskConversationUid } from "@/lib/supabase/crm";
import { getContactById } from "@/lib/supabase/crm";
import { getDisplayLabelForUser } from "@/lib/blog-comments/author-name";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TaskThreadSection } from "@/components/crm/TaskThreadSection";
import { TaskAssigneesDetailCard } from "@/components/crm/TaskAssigneesReadOnlyCard";
import { TaskTimeLogsSection } from "@/components/crm/TaskTimeLogsSection";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import {
  ADMIN_TASKS_LIST_PATH,
  parseTaskDetailFrom,
  taskDetailQuery,
  type TaskDetailFrom,
} from "@/lib/tasks/task-detail-nav";
import { TaskBentoPanelTitle } from "@/components/tasks/TaskBentoPanelTitle";
import { TaskResourcesSection } from "@/components/tasks/TaskResourcesSection";
import { ScheduleDueSubStatus } from "@/components/tasks/ScheduleDueSubStatus";

function contactDisplayName(c: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
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

  const followersWithLabels = await resolveTaskFollowersWithLabels(followers);

  function formatDateIso(s: string | null): string {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  const backHref =
    from === "project" ? `/admin/projects/${projectId}` : ADMIN_TASKS_LIST_PATH;
  const backLabel =
    from === "project" ? `← Back to ${project.name}` : "← Back to all tasks";
  const fromQuery = taskDetailQuery(from);
  const editHref = `/admin/projects/${projectId}/tasks/${taskId}/edit${fromQuery}`;

  return (
    <div className="mx-auto max-w-7xl pb-6">
      {/* Page chrome: outside bento “stage” (task-bento-page) */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-3 sm:mb-4 sm:px-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Task Detail View</h1>
          <Link
            href={backHref}
            className="mt-1 inline-block text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {backLabel}
          </Link>
        </div>
        <Button
          size="sm"
          className="task-bento-primary-btn shrink-0 rounded-xl border border-white/60 bg-primary/95 backdrop-blur-sm transition-[box-shadow,transform] hover:bg-primary active:scale-[0.98]"
          asChild
        >
          <Link href={editHref}>Edit Task</Link>
        </Button>
      </div>

      <div className="task-bento-page space-y-3 md:space-y-4">
      {/* Hero — primary bento tile */}
      <section className="task-bento-hero border-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div
            className="task-bento-chip shrink-0"
            title="Task reference for support and linking"
          >
            {task.task_number}
          </div>
          <h1 className="min-w-0 flex-1 text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
            {task.title}
          </h1>
        </div>
        {task.description?.trim() ? (
          <p className="mt-2 text-sm leading-snug text-muted-foreground whitespace-pre-wrap">
            {task.description}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground">No description.</p>
        )}
      </section>

      {/* Four equal meta panels (1 col → 2×2 → 4×1) */}
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4 lg:grid-rows-1">
        <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
          <CardHeader className="task-bento-card-header">
            <TaskBentoPanelTitle icon={LayoutGrid}>Phase &amp; Type</TaskBentoPanelTitle>
          </CardHeader>
          <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Phase</p>
              <TermBadge term={phaseTerm} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Type</p>
              <TermBadge term={typeTerm} />
            </div>
          </CardContent>
        </Card>

        <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
          <CardHeader className="task-bento-card-header">
            <TaskBentoPanelTitle icon={Calendar}>Schedule and Status</TaskBentoPanelTitle>
          </CardHeader>
          <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums">
                {formatDateIso(task.start_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due</p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums">
                {formatDateIso(task.due_date)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Status</p>
              <TermBadge term={statusTerm} />
              <ScheduleDueSubStatus dueDate={task.due_date} />
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 h-full">
          <TaskAssigneesDetailCard followers={followersWithLabels} />
        </div>

        <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
          <CardHeader className="task-bento-card-header">
            <TaskBentoPanelTitle icon={Paperclip}>Assigned resources</TaskBentoPanelTitle>
          </CardHeader>
          <CardContent className="task-bento-card-content flex flex-1 flex-col">
            <TaskResourcesSection taskId={taskId} canManage={false} />
          </CardContent>
        </Card>
      </div>

      <TaskTimeLogsSection
        taskId={taskId}
        initialLogs={timeLogs}
        userLabels={timeLogUserLabels}
        contactLabels={timeLogContactLabels}
        taskStatusSlug={task.task_status_slug}
        estimatedMinutes={task.proposed_time}
      />

      <TaskThreadSection taskId={taskId} initialNotes={notes} authorLabels={authorLabels} />
      </div>
    </div>
  );
}
