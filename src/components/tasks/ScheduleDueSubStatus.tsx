import { dueDateScheduleHint } from "@/lib/tasks/display-helpers";
import { isTaskStatusCompletedSlug } from "@/lib/tasks/task-status-reserved";
import { cn } from "@/lib/utils";

type ScheduleDueSubStatusProps = {
  dueDate: string | null | undefined;
  /** When status is completed, overdue never applies — line hidden (no false "Overdue"). */
  taskStatusSlug: string | null | undefined;
};

/**
 * Compact line under task status on Schedule card: green "On Schedule" or red "Overdue".
 * Overdue only when status is not completed and due date (local calendar) is before today.
 * Renders nothing when due is missing/invalid, or when task is completed.
 */
export function ScheduleDueSubStatus({ dueDate, taskStatusSlug }: ScheduleDueSubStatusProps) {
  if (isTaskStatusCompletedSlug(taskStatusSlug)) return null;
  const hint = dueDateScheduleHint(dueDate);
  if (!hint) return null;
  const overdue = hint === "overdue";
  return (
    <p
      className={cn(
        "mt-0.5 text-[0.6875rem] font-medium leading-none",
        overdue ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {overdue ? "Overdue" : "On Schedule"}
    </p>
  );
}
