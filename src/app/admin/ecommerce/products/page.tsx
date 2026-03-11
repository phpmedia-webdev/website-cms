import { Suspense } from "react";
import { getProductList } from "@/lib/supabase/products";
import { ProductsListClient } from "./ProductsListClient";

export default async function EcommerceProductsPage() {
  const products = await getProductList();
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted-foreground">Loading…</div>}>
      <ProductsListClient initialProducts={products} />
    </Suspense>
  );
}
