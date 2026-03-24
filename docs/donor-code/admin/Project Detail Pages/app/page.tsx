import { ProjectOverview } from "@/components/project-overview";
import { ProjectTabs } from "@/components/project-tabs";
import { ArrowLeft, MoreHorizontal, Share2 } from "lucide-react";

export default function ProjectDetailPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
        {/* Breadcrumb / nav */}
        <header className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to projects"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">All Projects</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              className="glass-card flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Share project"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              className="glass-card flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </header>

        {/* Overview section */}
        <ProjectOverview />

        {/* Tabbed section */}
        <ProjectTabs />
      </div>
    </main>
  );
}
