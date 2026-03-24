"use client";

import { cn } from "@/lib/utils";

export type ProjectProgressSegmentState = "done" | "overdue" | "todo" | "cancelled";

export interface ProjectProgressSegment {
  id: string;
  state: ProjectProgressSegmentState;
  label?: string;
}

interface ProjectProgressSegmentsProps {
  segments: ProjectProgressSegment[];
  className?: string;
  /** When true, show X/Y (Z%) or "No tasks" to the right of the bar. Default true. */
  showMetric?: boolean;
}

const STATE_STYLES: Record<ProjectProgressSegmentState, string> = {
  done: "bg-emerald-500",
  overdue: "bg-red-500",
  todo: "bg-muted-foreground/25",
  cancelled: "bg-muted-foreground/15",
};

export function ProjectProgressSegments({
  segments,
  className,
  showMetric = true,
}: ProjectProgressSegmentsProps) {
  const total = segments.length;
  const completed = segments.filter((s) => s.state === "done").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const bar = segments.length === 0 ? (
    <div className={cn("h-2 min-w-[80px] rounded-full bg-muted", className)} />
  ) : (
    <div
      className={cn("flex h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-label="Project task progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      {segments.map((segment) => (
        <div
          key={segment.id}
          title={segment.label}
          className={cn("h-full flex-1", STATE_STYLES[segment.state])}
        />
      ))}
    </div>
  );

  if (!showMetric) {
    return bar;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {bar}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {total === 0 ? "No tasks" : `${completed}/${total} (${pct}%)`}
      </span>
    </div>
  );
}
