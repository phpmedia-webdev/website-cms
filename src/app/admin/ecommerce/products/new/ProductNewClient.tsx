"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getContentTypes } from "@/lib/supabase/content";
import { insertProductRow } from "@/lib/supabase/products";
import { ContentEditorForm, type ContentEditorFormHandle } from "@/components/content/ContentEditorForm";
import { ProductDetailsForm, defaultProductState, type ProductFormState } from "@/components/ecommerce/ProductDetailsForm";
import { Button } from "@/components/ui/button";
import type { ContentRow, ContentType } from "@/types/content";

export function ProductNewClient() {
  const router = useRouter();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [productType, setProductType] = useState<ContentType | null>(null);
  const [productState, setProductState] = useState<ProductFormState>(defaultProductState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<ContentEditorFormHandle>(null);

  useEffect(() => {
    getContentTypes()
      .then((t) => {
        setTypes(t);
        const product = t.find((x) => x.slug === "product") ?? null;
        setProductType(product);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = async (contentId?: string) => {
    if (!contentId) return;
    setSaving(true);
    try {
      const result = await insertProductRow({
        content_id: contentId,
        price: productState.price,
        currency: productState.currency || "USD",
        sku: productState.sku || null,
        stock_quantity: productState.stock_quantity,
        gallery_id: productState.gallery_id || null,
        taxable: productState.taxable,
        shippable: productState.shippable,
        available_for_purchase: productState.available_for_purchase,
        visibility_mag_ids: productState.visibilityMagIds,
      });
      if (!result) throw new Error("Failed to create product row");
      router.push("/admin/ecommerce/products");
    } catch (e) {
      console.error("Product row create failed:", e);
      alert("Content saved but product details failed to save. You can edit the product to add details.");
      router.push(`/admin/ecommerce/products/${contentId}/edit`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/ecommerce/products");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!productType) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/ecommerce/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <p className="text-destructive">Product content type not found.</p>
      </div>
    );
  }

  const productTypesOnly: ContentType[] = [productType];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/ecommerce/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>
          <span className="font-bold text-2xl">New product</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => formRef.current?.save()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Create product"
            )}
          </Button>
        </div>
      </header>

      <ContentEditorForm
        ref={formRef}
        item={null}
        types={productTypesOnly}
        onSaved={handleSaved}
        onCancel={handleCancel}
        initialContentTypeSlug="product"
        onSavingChange={setSaving}
        productVisibilityMagIds={productState.visibilityMagIds}
        onProductVisibilityMagIdsChange={(ids) =>
          setProductState((prev) => ({ ...prev, visibilityMagIds: ids }))
        }
      />

      <ProductDetailsForm
        value={productState}
        onChange={setProductState}
        stripeProductId={null}
        disabled={saving}
      />
    </div>
  );
}
