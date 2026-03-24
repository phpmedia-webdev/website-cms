"use client";

import { useState, useMemo } from "react";
import { mockTasks, mockTeamMembers, type Task, type TaskStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
  ArrowUpRight,
  Clock,
} from "lucide-react";

// ── Status chip ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<TaskStatus, { label: string; className: string }> = {
  todo:        { label: "To Do",      className: "bg-slate-100 text-slate-600 border border-slate-200" },
  "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  review:      { label: "Review",     className: "bg-amber-100 text-amber-700 border border-amber-200" },
  done:        { label: "Done",       className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  blocked:     { label: "Blocked",    className: "bg-red-100 text-red-600 border border-red-200" },
};

const PRIORITY_MAP = {
  low:      { label: "Low",      className: "bg-slate-100 text-slate-500 border border-slate-200" },
  medium:   { label: "Medium",   className: "bg-amber-50  text-amber-600 border border-amber-200" },
  high:     { label: "High",     className: "bg-orange-100 text-orange-600 border border-orange-200" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border border-red-200" },
};

function StatusChip({ status }: { status: TaskStatus }) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

function PriorityChip({ priority }: { priority: Task["priority"] }) {
  const cfg = PRIORITY_MAP[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

function MemberAvatar({ name, id }: { name: string; id: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  const hue = (parseInt(id) * 47 + 200) % 360;
  return (
    <span
      className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: `oklch(0.52 0.2 ${hue})` }}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  );
}

// ── Sort helpers ─────────────────────────────────────────────────────────────
type SortKey = "title" | "status" | "priority" | "assignee" | "dueDate" | "loggedHours";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<Task["priority"], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};
const STATUS_ORDER: Record<TaskStatus, number> = {
  blocked: 0, "in-progress": 1, review: 2, todo: 3, done: 4,
};

function sortTasks(tasks: Task[], key: SortKey, dir: SortDir): Task[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "title":      cmp = a.title.localeCompare(b.title); break;
      case "status":     cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case "priority":   cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
      case "assignee":   cmp = a.assignee.name.localeCompare(b.assignee.name); break;
      case "dueDate":    cmp = a.dueDate.localeCompare(b.dueDate); break;
      case "loggedHours": cmp = a.loggedHours - b.loggedHours; break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Column header ────────────────────────────────────────────────────────────
function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={cn("px-3 py-3 text-left", className)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 text-xs font-semibold uppercase tracking-wide select-none",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const ALL_STATUSES: TaskStatus[] = ["todo", "in-progress", "review", "done", "blocked"];

export function TasksTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const tasks = mockTasks;
  const members = mockTeamMembers ?? tasks.map((t) => t.assignee).filter(
    (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (assigneeFilter !== "all") result = result.filter((t) => t.assignee.id === assigneeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      );
    }
    return sortTasks(result, sortKey, sortDir);
  }, [tasks, statusFilter, assigneeFilter, search, sortKey, sortDir]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAssigneeFilter("all");
  };
  const hasFilters = search || statusFilter !== "all" || assigneeFilter !== "all";

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "all")}
          className="py-2 pl-3 pr-8 text-sm rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground appearance-none cursor-pointer"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_MAP[s].label}</option>
          ))}
        </select>
        {/* Assignee filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm rounded-lg bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground appearance-none cursor-pointer"
          aria-label="Filter by assignee"
        >
          <option value="all">All assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {tasks.length} task{tasks.length !== 1 ? "s" : ""}
      </p>

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl">
        <table className="w-full text-sm border-collapse" aria-label="Project tasks">
          <thead>
            <tr className="glass-card border-b border-border">
              <SortableHeader label="Task" sortKey="title" current={sortKey} dir={sortDir} onSort={handleSort} className="pl-4" />
              <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label="Priority" sortKey="priority" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label="Assignee" sortKey="assignee" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label="Due Date" sortKey="dueDate" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label="Time" sortKey="loggedHours" current={sortKey} dir={sortDir} onSort={handleSort} className="pr-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  No tasks match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((task, i) => (
                <tr
                  key={task.id}
                  className={cn(
                    "border-b border-border/50 transition-colors hover:bg-primary/5",
                    i % 2 === 0 ? "bg-card/40" : "bg-card/20"
                  )}
                >
                  <td className="pl-4 pr-3 py-3 max-w-[260px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground line-clamp-1">{task.title}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{task.id}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={task.status} />
                  </td>
                  <td className="px-3 py-3">
                    <PriorityChip priority={task.priority} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={task.assignee.name} id={task.assignee.id} />
                      <span className="text-sm text-foreground whitespace-nowrap">{task.assignee.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{task.dueDate}</td>
                  <td className="pl-3 pr-4 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                      <Clock className="size-3" />
                      <span className="text-xs">
                        {task.loggedHours}h / {task.estimatedHours}h
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-sm">
            No tasks match your filters.
          </p>
        ) : (
          filtered.map((task) => (
            <div
              key={task.id}
              className="glass-card rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground text-sm leading-snug">{task.title}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{task.id}</span>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{task.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={task.status} />
                <PriorityChip priority={task.priority} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MemberAvatar name={task.assignee.name} id={task.assignee.id} />
                  <span>{task.assignee.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {task.loggedHours}h / {task.estimatedHours}h
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Due: {task.dueDate}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
