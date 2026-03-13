import { Suspense } from "react";
import { getProductList } from "@/lib/supabase/products";
import { ProductsListClient } from "./ProductsListClient";
import { StripeDriftCard } from "./StripeDriftCard";
import { StripeSyncCustomersCard } from "./StripeSyncCustomersCard";

export default async function EcommerceProductsPage() {
  const products = await getProductList();
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted-foreground">Loading…</div>}>
      <div className="space-y-6">
        <ProductsListClient initialProducts={products} />
        <StripeDriftCard />
        <StripeSyncCustomersCard />
      </div>
    </Suspense>
  );
}
