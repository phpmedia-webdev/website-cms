import { dueDateScheduleHint } from "@/lib/tasks/display-helpers";
import { cn } from "@/lib/utils";

/**
 * Compact line under task status on Schedule card: green "On Schedule" or red "Overdue" from due date only.
 * Renders nothing when due is missing/invalid.
 */
export function ScheduleDueSubStatus({ dueDate }: { dueDate: string | null | undefined }) {
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
