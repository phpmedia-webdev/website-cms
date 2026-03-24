import type { ReactNode } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { TaskBentoPanelTitle } from "@/components/tasks/TaskBentoPanelTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { avatarBgClass, initialsFromLabel } from "@/lib/tasks/display-helpers";
import type { TaskFollowerWithLabel } from "@/lib/tasks/task-follower-types";
import { cn } from "@/lib/utils";

/** Single row: avatar circle + name (+ optional role). Used on task edit/detail with optional trailing action. */
export function AssigneeListItem({
  follower,
  trailing,
  showRole = true,
}: {
  follower: TaskFollowerWithLabel;
  trailing?: ReactNode;
  /** When false, only the display name is shown (assignee cards). */
  showRole?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
            avatarBgClass(follower.id)
          )}
          aria-hidden
        >
          {initialsFromLabel(follower.label)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{follower.label}</p>
          {showRole ? (
            <p className="text-xs capitalize text-muted-foreground">{follower.role}</p>
          ) : null}
        </div>
      </div>
      {trailing}
    </li>
  );
}

/**
 * Task detail only: title + list or empty line. No helper text, links, or controls.
 * Manage assignees on **Edit task** (`TaskFollowersSection`).
 */
export function TaskAssigneesDetailCard({ followers }: { followers: TaskFollowerWithLabel[] }) {
  return (
    <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
      <CardHeader className="task-bento-card-header">
        <TaskBentoPanelTitle icon={Users}>Assignees</TaskBentoPanelTitle>
      </CardHeader>
      <CardContent className="task-bento-card-content flex flex-1 flex-col">
        {followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Assignees Yet.</p>
        ) : (
          <ul className="space-y-2">
            {followers.map((f) => (
              <AssigneeListItem key={f.id} follower={f} showRole={false} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * @deprecated Edit page uses `TaskFollowersSection` for assignees. Kept if needed elsewhere.
 */
export function TaskAssigneesReadOnlyCard({
  followers,
  manageHref,
  manageLabel = "Task detail",
}: {
  followers: TaskFollowerWithLabel[];
  /** Link to task detail for managing assignees */
  manageHref: string;
  manageLabel?: string;
}) {
  return (
    <Card variant="bento" className="task-bento-tile">
      <CardHeader className="task-bento-card-header">
        <TaskBentoPanelTitle icon={Users}>Assignees</TaskBentoPanelTitle>
        <p className="text-xs text-muted-foreground leading-snug">
          Add or remove people on{" "}
          <Link
            href={manageHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {manageLabel}
          </Link>
          .
        </p>
      </CardHeader>
      <CardContent className="task-bento-card-content">
        {followers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignees yet.</p>
        ) : (
          <ul className="space-y-2">
            {followers.map((f) => (
              <AssigneeListItem key={f.id} follower={f} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
