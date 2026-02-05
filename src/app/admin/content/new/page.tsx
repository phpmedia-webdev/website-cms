import { Suspense } from "react";
import { ContentNewClient } from "./ContentNewClient";

export default function NewContentPage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted-foreground">Loading…</div>}>
      <ContentNewClient />
    </Suspense>
  );
}
