import { Suspense } from "react";
import { TemplateEditClient } from "./TemplateEditClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted-foreground">Loading…</div>}>
      <TemplateEditClient id={id} />
    </Suspense>
  );
}
