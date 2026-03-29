import type { ReactNode } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { TaskBentoPanelTitle } from "@/components/tasks/TaskBentoPanelTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { initialsFromLabel } from "@/lib/tasks/display-helpers";
import type { TaskFollowerWithLabel, TaskLinkedContactSummary } from "@/lib/tasks/task-follower-types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_MEMBERS = 3;

function avatarColorFromSeed(seed: string): string {
  const palette = ["#0ea5e9", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 997;
  return palette[h % palette.length] ?? "#64748b";
}

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
  const displayLabel = follower.label?.trim() ? follower.label.trim() : "Member";
  const initials =
    follower.avatar_initials?.trim() || initialsFromLabel(displayLabel) || "?";
  const avatarSeed =
    (typeof follower.id === "string" && follower.id.trim()) || displayLabel;
  return (
    <li className="flex items-center justify-between gap-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-500 text-[9px] font-semibold text-white"
          )}
          style={{ backgroundColor: avatarColorFromSeed(avatarSeed) }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-snug">{displayLabel}</p>
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
 * Task detail only: linked CRM contact first, then assignee list. No controls.
 * Manage on **Edit task** (`TaskFollowersSection`).
 */
export function TaskAssigneesDetailCard({
  followers,
  linkedContact,
}: {
  followers: TaskFollowerWithLabel[];
  /** Primary CRM contact for the task (e.g. ticket requester). */
  linkedContact: TaskLinkedContactSummary | null;
}) {
  const visibleFollowers = followers.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenFollowers = followers.slice(MAX_VISIBLE_MEMBERS);
  const hiddenMemberNames = hiddenFollowers.map((f) => f.label).join(", ");

  return (
    <Card variant="bento" className="task-bento-tile flex h-full min-w-0 flex-col">
      <CardHeader className="task-bento-card-header">
        <div className="flex items-center justify-between gap-2">
          <TaskBentoPanelTitle icon={Users}>Members</TaskBentoPanelTitle>
          {hiddenFollowers.length > 0 ? (
            <span
              className="inline-flex shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              title={hiddenMemberNames}
            >
              +{hiddenFollowers.length} more
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="task-bento-card-content flex flex-1 flex-col space-y-3.5">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Contact</p>
          {linkedContact ? (
            <AssigneeListItem
              follower={{
                id: `task-contact-${linkedContact.id}`,
                role: "follower",
                user_id: null,
                contact_id: linkedContact.id,
                label: linkedContact.label,
                avatar_initials: linkedContact.avatar_initials,
              }}
              showRole={false}
              trailing={
                <Link
                  href={`/admin/crm/contacts/${linkedContact.id}`}
                  className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View
                </Link>
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">No contact linked.</p>
          )}
        </div>
        <div className="border-t border-border/60 pt-2.5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Members</p>
          {followers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {visibleFollowers.map((f) => (
                <AssigneeListItem key={f.id} follower={f} showRole={false} />
              ))}
            </ul>
          )}
        </div>
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
  const visibleFollowers = followers.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenFollowers = followers.slice(MAX_VISIBLE_MEMBERS);
  const hiddenMemberNames = hiddenFollowers.map((f) => f.label).join(", ");

  return (
    <Card variant="bento" className="task-bento-tile">
      <CardHeader className="task-bento-card-header">
        <div className="flex items-center justify-between gap-2">
          <TaskBentoPanelTitle icon={Users}>Members</TaskBentoPanelTitle>
          {hiddenFollowers.length > 0 ? (
            <span
              className="inline-flex shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              title={hiddenMemberNames}
            >
              +{hiddenFollowers.length} more
            </span>
          ) : null}
        </div>
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
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {visibleFollowers.map((f) => (
              <AssigneeListItem key={f.id} follower={f} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
