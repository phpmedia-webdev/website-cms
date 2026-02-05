import { Suspense } from "react";
import { EditContentClient } from "./EditContentClient";

export default function EditContentPage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted-foreground">Loading…</div>}>
      <EditContentClient />
    </Suspense>
  );
}
