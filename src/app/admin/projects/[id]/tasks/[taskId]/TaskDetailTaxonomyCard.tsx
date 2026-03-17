"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TaxonomyChips } from "@/components/taxonomy/TaxonomyChips";
import { TaxonomyAssignmentForContent } from "@/components/taxonomy/TaxonomyAssignmentForContent";
import type { TaxonomyTermDisplay } from "@/lib/supabase/taxonomy";

interface TaskDetailTaxonomyCardProps {
  taskId: string;
  taskTaxonomy: { categories: TaxonomyTermDisplay[]; tags: TaxonomyTermDisplay[] };
}

export function TaskDetailTaxonomyCard({ taskId, taskTaxonomy }: TaskDetailTaxonomyCardProps) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="text-lg font-medium">Categories & tags</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {(taskTaxonomy.categories.length > 0 || taskTaxonomy.tags.length > 0) && (
          <TaxonomyChips categories={taskTaxonomy.categories} tags={taskTaxonomy.tags} />
        )}
        <TaxonomyAssignmentForContent
          contentId={taskId}
          contentTypeSlug="task"
          section="task"
          sectionLabel="Tasks"
          compact
          onSaved={() => router.refresh()}
        />
      </CardContent>
    </Card>
  );
}
