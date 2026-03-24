"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TermBadge } from "@/components/taxonomy/TermBadge";
import { ProjectMemberAvatars, type ProjectMemberAvatarItem } from "./ProjectMemberAvatars";
import { ProjectProgressSegments, type ProjectProgressSegment } from "./ProjectProgressSegments";

export interface ProjectListTerm {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface ProjectListClientInfo {
  label: string;
  href: string | null;
  avatarUrl: string | null;
}

export interface ProjectListRow {
  id: string;
  name: string;
  archivedAt: string | null;
  dueDate: string | null;
  statusTerm: ProjectListTerm | null;
  projectTypeTerm: ProjectListTerm | null;
  client: ProjectListClientInfo | null;
  members: ProjectMemberAvatarItem[];
  /** Team `user_id`s on `project_members` (for “My projects” preset). */
  memberUserIds: string[];
  progressSegments: ProjectProgressSegment[];
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function AvatarFallback({ label }: { label: string }) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

interface ProjectListTableProps {
  projects: ProjectListRow[];
}

/** `table-fixed` column widths (%), sum 100. */
const COL = {
  title: "w-[27%]",
  type: "w-[10%]",
  client: "w-[12%]",
  members: "w-[13%]",
  dueDate: "w-[10%]",
  progress: "w-[15%]",
  status: "w-[13%]",
} as const;

const TD = "p-4 align-middle min-w-0";

export function ProjectListTable({ projects }: ProjectListTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed caption-bottom text-sm">
            <colgroup>
              <col className={COL.title} />
              <col className={COL.type} />
              <col className={COL.client} />
              <col className={COL.members} />
              <col className={COL.dueDate} />
              <col className={COL.progress} />
              <col className={COL.status} />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 min-w-0 px-4 text-left font-medium">Title</th>
                <th className="h-10 min-w-0 px-4 text-center font-medium">Type</th>
                <th className="h-10 min-w-0 px-4 text-left font-medium">Client</th>
                <th className="h-10 min-w-0 px-4 text-left font-medium">Members</th>
                <th className="h-10 min-w-0 px-4 text-left font-medium">Due Date</th>
                <th className="h-10 min-w-0 px-4 text-left font-medium">Progress</th>
                <th className="h-10 min-w-0 px-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No projects yet. Click “New project” to add one.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-muted/50 align-middle">
                    <td className={TD}>
                      <div className="min-w-0 overflow-hidden">
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="block max-w-full truncate font-medium text-primary hover:underline"
                          title={project.name}
                        >
                          {project.name}
                        </Link>
                        {project.archivedAt && (
                          <div className="text-xs text-muted-foreground">Archived</div>
                        )}
                      </div>
                    </td>
                    <td className={`${TD} text-center`}>
                      <TermBadge term={project.projectTypeTerm} />
                    </td>
                    <td className={TD}>
                      {project.client ? (
                        project.client.href ? (
                        <Link
                          href={project.client.href}
                          className="inline-flex items-center gap-2 max-w-full hover:text-primary"
                        >
                          {project.client.avatarUrl ? (
                            <img
                              src={project.client.avatarUrl}
                              alt={project.client.label}
                              className="h-6 w-6 rounded-full object-cover border"
                            />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border bg-muted text-[10px] font-medium text-muted-foreground">
                              <AvatarFallback label={project.client.label} />
                            </span>
                          )}
                          <span className="truncate">{project.client.label}</span>
                        </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 max-w-full">
                            {project.client.avatarUrl ? (
                              <img
                                src={project.client.avatarUrl}
                                alt={project.client.label}
                                className="h-6 w-6 rounded-full object-cover border"
                              />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border bg-muted text-[10px] font-medium text-muted-foreground">
                                <AvatarFallback label={project.client.label} />
                              </span>
                            )}
                            <span className="truncate">{project.client.label}</span>
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      <ProjectMemberAvatars members={project.members} />
                    </td>
                    <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                      {formatDate(project.dueDate)}
                    </td>
                    <td className={TD}>
                      <ProjectProgressSegments segments={project.progressSegments} />
                    </td>
                    <td className={`${TD} text-center`}>
                      <TermBadge term={project.statusTerm} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
