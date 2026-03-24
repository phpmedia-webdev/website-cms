"use client";

import { mockProject, mockTasks } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Tag,
  Users,
  TrendingUp,
  Hash,
} from "lucide-react";

const statusConfig = {
  new:      { label: "New",      className: "bg-blue-100 text-blue-700 border border-blue-200" },
  active:   { label: "Active",   className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  complete: { label: "Complete", className: "bg-slate-100 text-slate-600 border border-slate-200" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-foreground font-semibold text-base leading-tight">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}

export function ProjectOverview() {
  const project = mockProject;
  const tasks = mockTasks;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const loggedHours = tasks.reduce((sum, t) => sum + t.loggedHours, 0);

  const status = statusConfig[project.status];

  return (
    <section className="glass-card rounded-2xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
              <Hash className="size-3" />
              {project.id}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance leading-tight">
            {project.title}
          </h1>
          <span
            className={cn(
              "self-start text-xs font-semibold px-2.5 py-0.5 rounded-full",
              status.className
            )}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>

      {/* Key details grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Tag} label="Type" value={project.type} />
        <StatCard
          icon={Calendar}
          label="Start"
          value={project.startDate}
        />
        <StatCard
          icon={Calendar}
          label="End"
          value={project.endDate}
        />
        <StatCard
          icon={Clock}
          label="Est. Hours"
          value={`${project.estimatedHours} h`}
        />
      </div>

      {/* Time tracking */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Clock}
          label="Logged Time"
          value={`${loggedHours} h`}
          sub={`of ${project.estimatedHours} h estimated`}
        />
        <StatCard
          icon={TrendingUp}
          label="Utilization"
          value={`${Math.round((loggedHours / project.estimatedHours) * 100)}%`}
          sub="of budget consumed"
        />
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <CheckCircle2 className="size-4 text-primary" />
            Task Progress
          </div>
          <span className="text-sm font-semibold text-primary">
            {doneTasks}/{totalTasks} tasks — {progressPct}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Team */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Users className="size-4 text-primary" />
          Team
        </div>
        <div className="flex flex-wrap gap-2">
          {project.members.map((member) => (
            <div
              key={member.id}
              className="glass-card flex items-center gap-2 rounded-full py-1 pl-1 pr-3"
            >
              <span
                className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0"
                style={{
                  background: `oklch(0.52 0.2 ${(parseInt(member.id) * 47 + 200) % 360})`,
                }}
                aria-hidden="true"
              >
                {member.name.split(" ").map((n) => n[0]).join("")}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {member.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
