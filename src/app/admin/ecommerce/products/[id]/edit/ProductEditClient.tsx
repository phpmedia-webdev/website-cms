"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [linkStripeProductId, setLinkStripeProductId] = useState("");
  const [linkStripePriceId, setLinkStripePriceId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
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
          downloadable: productState.downloadable,
          digital_delivery_links: productState.digitalDeliveryLinks.filter((l) => l.url.trim().length > 0),
          available_for_purchase: productState.available_for_purchase,
          is_recurring: productState.is_recurring,
          billing_interval: productState.billing_interval,
          visibility_mag_ids: productState.visibilityMagIds,
          grant_mag_id: productState.grantMagId || null,
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
          downloadable: productState.downloadable,
          digital_delivery_links: productState.digitalDeliveryLinks.filter((l) => l.url.trim().length > 0),
          available_for_purchase: productState.available_for_purchase,
          is_recurring: productState.is_recurring,
          billing_interval: productState.billing_interval,
          visibility_mag_ids: productState.visibilityMagIds,
          grant_mag_id: productState.grantMagId || null,
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
    if (!content?.id) return;
    const needsProduct = !product?.stripe_product_id;
    const needsRecurringPrice =
      product?.is_recurring && product?.stripe_product_id && !product?.stripe_price_id;
    if (!needsProduct && !needsRecurringPrice) return;
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

  const handleLinkToStripe = async () => {
    const productId = (linkStripeProductId || product?.stripe_product_id ?? "").trim();
    if (!content?.id || !productId) return;
    const priceId = (linkStripePriceId || product?.stripe_price_id ?? "").trim();
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/ecommerce/products/${content.id}/link-stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_product_id: productId,
          stripe_price_id: productState.is_recurring && priceId ? priceId : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Link to Stripe failed.");
        return;
      }
      setLinkStripeProductId("");
      setLinkStripePriceId("");
      router.refresh();
    } catch (e) {
      console.error("Link to Stripe error:", e);
      alert("Link to Stripe failed.");
    } finally {
      setLinkLoading(false);
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
            {!product.stripe_product_id
              ? "Create a Stripe Product from this CMS product to enable checkout. Price is not sent to Stripe; checkout uses app-side pricing."
              : "Create a recurring Price in Stripe for this subscription product so customers can checkout."}
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
                {product.stripe_product_id && product.is_recurring
                  ? "Create recurring Price in Stripe"
                  : "Create Stripe Product from CMS Product"}
              </>
            )}
          </Button>
        </div>
      )}

      {product && (
        <div className="rounded-md border bg-muted/30 p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {product.stripe_product_id ? "Change Stripe link" : "Link to existing Stripe product"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Paste Stripe Product ID (and Price ID for subscriptions) to link this app product to an existing Stripe product. No new objects are created in Stripe.
          </p>
          <div className="grid gap-2 max-w-md">
            <div>
              <Label htmlFor="link-stripe-product-id">Stripe Product ID</Label>
              <Input
                id="link-stripe-product-id"
                placeholder="prod_…"
                value={linkStripeProductId || (product.stripe_product_id ?? "")}
                onChange={(e) => setLinkStripeProductId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            {productState.is_recurring && (
              <div>
                <Label htmlFor="link-stripe-price-id">Stripe Price ID (optional for subscriptions)</Label>
                <Input
                  id="link-stripe-price-id"
                  placeholder="price_…"
                  value={linkStripePriceId || (product.stripe_price_id ?? "")}
                  onChange={(e) => setLinkStripePriceId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleLinkToStripe}
            disabled={
              saving ||
              linkLoading ||
              !(linkStripeProductId || product?.stripe_product_id ?? "").trim()
            }
          >
            {linkLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                {product.stripe_product_id ? "Update link" : "Link to Stripe"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
