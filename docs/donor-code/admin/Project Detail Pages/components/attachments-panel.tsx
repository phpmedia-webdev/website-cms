"use client";

import { mockAttachments, type Attachment } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Figma,
  Link2,
  File,
  Download,
  ExternalLink,
} from "lucide-react";

const TYPE_ICON_MAP: Record<Attachment["type"], { icon: React.ElementType; className: string; bg: string }> = {
  pdf:         { icon: FileText,         className: "text-red-500",    bg: "bg-red-50 border border-red-100" },
  image:       { icon: ImageIcon,         className: "text-blue-500",   bg: "bg-blue-50 border border-blue-100" },
  doc:         { icon: File,              className: "text-indigo-500", bg: "bg-indigo-50 border border-indigo-100" },
  spreadsheet: { icon: FileSpreadsheet,   className: "text-emerald-500",bg: "bg-emerald-50 border border-emerald-100" },
  figma:       { icon: Figma,             className: "text-purple-500", bg: "bg-purple-50 border border-purple-100" },
  link:        { icon: Link2,             className: "text-primary",    bg: "bg-primary/10 border border-primary/20" },
};

function MemberAvatar({ name, id }: { name: string; id: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  const hue = (parseInt(id) * 47 + 200) % 360;
  return (
    <span
      className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ background: `oklch(0.52 0.2 ${hue})` }}
      title={name}
    >
      {initials}
    </span>
  );
}

export function AttachmentsPanel() {
  const attachments = mockAttachments;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {attachments.map((att) => {
        const cfg = TYPE_ICON_MAP[att.type];
        const Icon = cfg.icon;
        const isLink = att.type === "link" || att.type === "figma";
        return (
          <div
            key={att.id}
            className="glass-card rounded-xl p-4 flex items-start gap-3 group hover:shadow-md transition-shadow"
          >
            <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
              <Icon className={cn("size-5", cfg.className)} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground leading-snug line-clamp-1">{att.name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MemberAvatar name={att.uploadedBy.name} id={att.uploadedBy.id} />
                  {att.uploadedBy.name}
                </span>
                <span>·</span>
                <span>{att.uploadedAt}</span>
                {att.size !== "—" && (
                  <>
                    <span>·</span>
                    <span>{att.size}</span>
                  </>
                )}
              </div>
            </div>
            <a
              href={att.url}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label={isLink ? `Open ${att.name}` : `Download ${att.name}`}
            >
              {isLink ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
            </a>
          </div>
        );
      })}
    </div>
  );
}
