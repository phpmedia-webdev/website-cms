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
}: ProjectProgressSegmentsProps) {
  if (segments.length === 0) {
    return <div className={cn("h-2 rounded-full bg-muted", className)} />;
  }

  return (
    <div
      className={cn("flex h-2 overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-label="Project task progress"
      aria-valuemin={0}
      aria-valuemax={100}
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
}
