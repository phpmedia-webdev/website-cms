"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud } from "lucide-react";
import { getContentTypes } from "@/lib/supabase/content";
import { insertProductRow, updateProductRow } from "@/lib/supabase/products";
import type { ProductRow } from "@/lib/supabase/products";
import { ContentEditorForm, type ContentEditorFormHandle } from "@/components/content/ContentEditorForm";
import {
  ProductDetailsForm,
  defaultProductState,
  productFormStateFromRow,
  type ProductFormState,
} from "@/components/ecommerce/ProductDetailsForm";
import { Button } from "@/components/ui/button";
import type { ContentRow, ContentType } from "@/types/content";

interface ProductEditClientProps {
  content: ContentRow | null;
  product: ProductRow | null;
}

export function ProductEditClient({ content, product }: ProductEditClientProps) {
  const router = useRouter();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [productType, setProductType] = useState<ContentType | null>(null);
  const [productState, setProductState] = useState<ProductFormState>(
    product ? productFormStateFromRow(product) : defaultProductState
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingStripe, setSyncingStripe] = useState(false);
  const formRef = useRef<ContentEditorFormHandle>(null);

  useEffect(() => {
    getContentTypes()
      .then((t) => {
        setTypes(t);
        const p = t.find((x) => x.slug === "product") ?? null;
        setProductType(p);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (product) setProductState(productFormStateFromRow(product));
  }, [product]);

  const handleSaved = async (contentId?: string) => {
    if (!contentId) return;
    setSaving(true);
    try {
      if (product) {
        const ok = await updateProductRow(contentId, {
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
        if (!ok) throw new Error("Failed to update product row");
      } else {
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
      }
      router.refresh();
    } catch (e) {
      console.error("Product save failed:", e);
      alert("Content saved but product details failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/ecommerce/products");
  };

  const handleSyncToStripe = async () => {
    if (!content?.id || product?.stripe_product_id) return;
    setSyncingStripe(true);
    try {
      const res = await fetch(`/api/ecommerce/products/${content.id}/sync-stripe`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Sync to Stripe failed.");
        return;
      }
      router.refresh();
    } catch (e) {
      console.error("Sync to Stripe error:", e);
      alert("Sync to Stripe failed.");
    } finally {
      setSyncingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/ecommerce/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <p className="text-destructive">Product not found.</p>
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
          <span className="font-bold text-2xl">Edit product</span>
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
              "Save"
            )}
          </Button>
        </div>
      </header>

      <ContentEditorForm
        ref={formRef}
        item={content}
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
        stripeProductId={product?.stripe_product_id ?? null}
        disabled={saving}
      />

      {product && !product.stripe_product_id && (
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground mb-2">
            Create a Stripe Product from this CMS product to enable checkout. Price is not sent to Stripe; checkout uses app-side pricing.
          </p>
          <Button
            variant="outline"
            onClick={handleSyncToStripe}
            disabled={saving || syncingStripe}
          >
            {syncingStripe ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" />
                Create Stripe Product from CMS Product
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
