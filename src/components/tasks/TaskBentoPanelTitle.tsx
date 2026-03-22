import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Uppercase bento card title (detail + edit task pages). */
export function taskBentoPanelTitleClass() {
  return "text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground";
}

/** Icon + label row for task bento cards. */
export function TaskBentoPanelTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <h2 className={`${taskBentoPanelTitleClass()} flex items-center gap-2`}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      {children}
    </h2>
  );
}
