import { Suspense } from "react";
import { ContentPageClient } from "./ContentPageClient";

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted-foreground">Loading…</div>}>
      <ContentPageClient />
    </Suspense>
  );
}
