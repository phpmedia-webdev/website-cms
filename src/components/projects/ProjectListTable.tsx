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
  proposedEndDate: string | null;
  statusTerm: ProjectListTerm | null;
  projectTypeTerm: ProjectListTerm | null;
  client: ProjectListClientInfo | null;
  members: ProjectMemberAvatarItem[];
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

export function ProjectListTable({ projects }: ProjectListTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Project title</th>
                <th className="h-10 px-4 text-left font-medium">Proposed End Date</th>
                <th className="h-10 px-4 text-left font-medium">Project client</th>
                <th className="h-10 px-4 text-left font-medium">Project status</th>
                <th className="h-10 px-4 text-left font-medium">Project members</th>
                <th className="h-10 px-4 text-left font-medium">Project progress</th>
                <th className="h-10 px-4 text-left font-medium">Project type</th>
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
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-background"
                          style={{
                            backgroundColor: project.projectTypeTerm?.color ?? "hsl(var(--muted-foreground))",
                          }}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="font-medium text-primary hover:underline break-words"
                          >
                            {project.name}
                          </Link>
                          {project.archivedAt && (
                            <div className="text-xs text-muted-foreground">Archived</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(project.proposedEndDate)}</td>
                    <td className="p-4">
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
                    <td className="p-4">
                      <TermBadge term={project.statusTerm} />
                    </td>
                    <td className="p-4">
                      <ProjectMemberAvatars members={project.members} />
                    </td>
                    <td className="p-4">
                      <ProjectProgressSegments segments={project.progressSegments} className="min-w-[180px]" />
                    </td>
                    <td className="p-4">
                      <TermBadge term={project.projectTypeTerm} />
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
