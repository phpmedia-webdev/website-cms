import { Suspense } from "react";
import { TemplateNewClient } from "./TemplateNewClient";

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-6 text-muted-foreground">Loading…</div>}>
      <TemplateNewClient />
    </Suspense>
  );
}
