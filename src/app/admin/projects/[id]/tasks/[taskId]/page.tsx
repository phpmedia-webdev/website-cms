import { notFound, redirect } from "next/navigation";
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
import {
  CUSTOMIZER_SCOPE_TASK_PHASE,
  CUSTOMIZER_SCOPE_TASK_STATUS,
  CUSTOMIZER_SCOPE_TASK_TYPE,
  resolveTaskCustomizerTerm,
  statusTermsFromCustomizerRows,
} from "@/lib/tasks/customizer-task-terms";
import {
  getNotesByConversationUid,
  taskConversationUid,
  getContactById,
  formatCrmContactDisplayName,
} from "@/lib/supabase/crm";
import { getDisplayLabelForUser, getRealNameLabelForUser } from "@/lib/blog-comments/author-name";
import { resolveTaskPageAvatarMaps } from "@/lib/tasks/task-page-avatar-maps";
import { initialsFromFirstLast } from "@/lib/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskThreadSection } from "@/components/crm/TaskThreadSection";
import { TaskAssigneesDetailCard } from "@/components/crm/TaskAssigneesReadOnlyCard";
import { TaskTimeLogsSection } from "@/components/crm/TaskTimeLogsSection";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import {
  ADMIN_TASKS_LIST_PATH,
  parseTaskDetailFrom,
  taskDetailPath,
  taskEditPath,
  type TaskDetailFrom,
} from "@/lib/tasks/task-detail-nav";
import { TaskBentoPanelTitle } from "@/components/tasks/TaskBentoPanelTitle";
import { TaskResourcesSection } from "@/components/tasks/TaskResourcesSection";
import { TaskReminderInlineControl } from "@/components/tasks/TaskReminderInlineControl";
import { TaskShowOnCalendarControl } from "@/components/tasks/TaskShowOnCalendarControl";
import { ScheduleDueSubStatus } from "@/components/tasks/ScheduleDueSubStatus";

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
  const [task, notes, followers, timeLogs, czTaskType, czTaskStatus, czTaskPhase] =
    await Promise.all([
      getTaskById(taskId),
      getNotesByConversationUid(taskConversationUid(taskId)),
      getTaskFollowers(taskId),
      listTaskTimeLogs(taskId),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_TYPE),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_STATUS),
      getCustomizerOptions(CUSTOMIZER_SCOPE_TASK_PHASE),
    ]);
  if (!task) notFound();
  const canonicalPid = task.project_id?.trim() ?? "";
  if (canonicalPid !== projectId) {
    redirect(taskDetailPath(taskId, task.project_id, from));
  }
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const statusTerms = statusTermsFromCustomizerRows(czTaskStatus);
  const typeTerms = statusTermsFromCustomizerRows(czTaskType);
  const taskPhaseTerms = statusTermsFromCustomizerRows(czTaskPhase);

  const statusTerm = resolveTaskCustomizerTerm(statusTerms, task.task_status_slug);
  const typeTerm = resolveTaskCustomizerTerm(typeTerms, task.task_type_slug);
  const phaseTerm = resolveTaskCustomizerTerm(taskPhaseTerms, task.task_phase_slug);

  const taskTimeLogTotalMinutes = timeLogs.reduce((sum, l) => sum + (l.minutes ?? 0), 0);

  const timeLogUserIds = [...new Set(timeLogs.map((l) => l.user_id).filter(Boolean))] as string[];
  const timeLogContactIds = [...new Set(timeLogs.map((l) => l.contact_id).filter(Boolean))] as string[];
  const authorIds = [...new Set(notes.map((n) => n.author_id).filter(Boolean))] as string[];

  const timeLogUserLabels: Record<string, string> = {};
  const timeLogContactLabels: Record<string, string> = {};
  await Promise.all([
    ...timeLogUserIds.map(async (id) => {
      timeLogUserLabels[id] = await getRealNameLabelForUser(id);
    }),
    ...timeLogContactIds.map(async (id) => {
      const c = await getContactById(id);
      timeLogContactLabels[id] = c ? formatCrmContactDisplayName(c) : "Contact";
    }),
  ]);

  const authorLabels: Record<string, string> = {};
  await Promise.all(
    authorIds.map(async (id) => {
      authorLabels[id] = await getDisplayLabelForUser(id);
    })
  );

  const { timeLogUserInitials, timeLogContactInitials, authorAvatarInitials } =
    await resolveTaskPageAvatarMaps({
      timeLogUserIds,
      timeLogContactIds,
      noteAuthorUserIds: authorIds,
    });

  const followersWithLabels = await resolveTaskFollowersWithLabels(followers);
  const assigneesOnly = followersWithLabels.filter((f) => f.role !== "creator");
  const creatorFollower = followersWithLabels.find((f) => f.role === "creator");
  const creatorName = creatorFollower?.user_id
    ? await getRealNameLabelForUser(creatorFollower.user_id)
    : creatorFollower?.label ?? (task.creator_id ? await getRealNameLabelForUser(task.creator_id) : null);
  const createdOn = new Date(task.created_at).toLocaleDateString();
  const createdByLine = creatorName
    ? `Created by ${creatorName} on ${createdOn}`
    : `Created on ${createdOn}`;

  let taskLinkedContact: {
    id: string;
    label: string;
    avatar_initials?: string;
  } | null = null;
  if (task.contact_id) {
    const c = await getContactById(task.contact_id);
    if (c)
      taskLinkedContact = {
        id: c.id,
        label: formatCrmContactDisplayName(c),
        avatar_initials: initialsFromFirstLast(c.first_name, c.last_name, c.email),
      };
  }

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

  function dateParamLocal(s: string | null): string {
    if (!s) return "";
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return "";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch {
      return "";
    }
  }

  const backHref =
    from === "project" ? `/admin/projects/${projectId}` : ADMIN_TASKS_LIST_PATH;
  const backLabel =
    from === "project" ? `← Back to ${project.name}` : "← Back to all tasks";
  const editHref = taskEditPath(taskId, task.project_id, from);
  const dueDateParam = dateParamLocal(task.due_date);
  const showOnCalendarHref = `/admin/events?source=task&task_id=${encodeURIComponent(taskId)}${dueDateParam ? `&date=${encodeURIComponent(dueDateParam)}` : ""}`;

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
        <p className="mt-2 text-right text-xs italic text-muted-foreground">{createdByLine}</p>
      </section>

      {/* Four equal meta panels (1 col → 2×2 → 4×1) */}
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-3.5 lg:grid-cols-4 lg:grid-rows-1">
        <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
          <CardHeader className="task-bento-card-header">
            <TaskBentoPanelTitle icon={Calendar}>Schedule and Status</TaskBentoPanelTitle>
          </CardHeader>
          <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                {formatDateIso(task.start_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due</p>
              <div className="mt-0.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {formatDateIso(task.due_date)}
                  </p>
                  <TaskReminderInlineControl taskId={taskId} dueDate={task.due_date} />
                </div>
                <div className="mt-1.5">
                  <TaskShowOnCalendarControl taskId={taskId} href={showOnCalendarHref} />
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Status</p>
              <TermBadge term={statusTerm} className="px-4 py-2 text-lg font-semibold leading-none" />
              <ScheduleDueSubStatus dueDate={task.due_date} taskStatusSlug={task.task_status_slug} />
            </div>
          </CardContent>
        </Card>

        <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
          <CardHeader className="task-bento-card-header">
            <TaskBentoPanelTitle icon={LayoutGrid}>Phase &amp; Type</TaskBentoPanelTitle>
          </CardHeader>
          <CardContent className="task-bento-card-content flex min-w-0 flex-1 flex-col space-y-2">
            <div className="min-w-0">
              <p className="mb-1 text-xs text-muted-foreground">Project</p>
              {task.project_id?.trim() ? (
                <Link
                  href={`/admin/projects/${task.project_id}`}
                  title={project?.name?.trim() ? project.name : "View project"}
                  className="block w-full min-w-0 truncate text-base font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                >
                  {project?.name?.trim() ? project.name : "View project"}
                </Link>
              ) : (
                <p className="truncate text-base font-medium text-muted-foreground">No project</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Phase</p>
              <TermBadge term={phaseTerm} className="px-4 py-2 text-lg font-semibold leading-none" />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Type</p>
              <TermBadge term={typeTerm} className="px-4 py-2 text-lg font-semibold leading-none" />
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 h-full">
          <TaskAssigneesDetailCard
            followers={assigneesOnly}
            linkedContact={taskLinkedContact}
          />
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
        userInitialsById={timeLogUserInitials}
        contactInitialsById={timeLogContactInitials}
        taskStatusSlug={task.task_status_slug}
        plannedMinutes={task.planned_time}
      />

      <TaskThreadSection
        taskId={taskId}
        initialNotes={notes}
        authorLabels={authorLabels}
        authorAvatarInitials={authorAvatarInitials}
      />
      </div>
    </div>
  );
}
