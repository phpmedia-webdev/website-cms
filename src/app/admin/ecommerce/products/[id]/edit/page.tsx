import { Suspense } from "react";
import { getContentByIdServer } from "@/lib/supabase/content";
import { getProductByContentId } from "@/lib/supabase/products";
import { ProductEditClient } from "./ProductEditClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const [content, product] = await Promise.all([
    getContentByIdServer(id),
    getProductByContentId(id),
  ]);
  return (
    <Suspense fallback={<div className="space-y-4 text-muted-foreground">Loading…</div>}>
      <ProductEditClient content={content} product={product} />
    </Suspense>
  );
}
