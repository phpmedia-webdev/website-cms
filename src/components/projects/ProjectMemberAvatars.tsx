"use client";

import { cn } from "@/lib/utils";

export interface ProjectMemberAvatarItem {
  id: string;
  label: string;
  avatarUrl: string | null;
}

interface ProjectMemberAvatarsProps {
  members: ProjectMemberAvatarItem[];
  className?: string;
  maxVisible?: number;
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

export function ProjectMemberAvatars({
  members,
  className,
  maxVisible = 5,
}: ProjectMemberAvatarsProps) {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - visible.length;

  if (visible.length === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visible.map((member) => (
          <span
            key={member.id}
            title={member.label}
            className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-background bg-muted text-[10px] font-medium text-muted-foreground"
          >
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.label}
                className="h-full w-full object-cover"
              />
            ) : (
              initials(member.label)
            )}
          </span>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">+{overflow}</span>
      )}
    </div>
  );
}
