import { Suspense } from "react";
import { ProductNewClient } from "./ProductNewClient";

export default function NewProductPage() {
  return (
    <Suspense fallback={<div className="space-y-4 text-muted-foreground">Loading…</div>}>
      <ProductNewClient />
    </Suspense>
  );
}
