"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getPublishedGalleries } from "@/lib/supabase/galleries";

export interface ProductFormState {
  price: number;
  currency: string;
  sku: string;
  stock_quantity: number | null;
  gallery_id: string;
  taxable: boolean;
  shippable: boolean;
  available_for_purchase: boolean;
  /** MAG ids that can see this product on the shop (when access_level is mag). */
  visibilityMagIds: string[];
}

const defaultProductState: ProductFormState = {
  price: 0,
  currency: "USD",
  sku: "",
  stock_quantity: null,
  gallery_id: "",
  taxable: true,
  shippable: false,
  available_for_purchase: true,
  visibilityMagIds: [],
};

export function productFormStateFromRow(row: {
  price: number;
  currency: string;
  sku: string | null;
  stock_quantity: number | null;
  gallery_id: string | null;
  taxable: boolean;
  shippable: boolean;
  available_for_purchase: boolean;
  visibility_mag_ids?: string[];
}): ProductFormState {
  return {
    price: Number(row.price),
    currency: row.currency ?? "USD",
    sku: row.sku ?? "",
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    gallery_id: row.gallery_id ?? "",
    taxable: row.taxable ?? true,
    shippable: row.shippable ?? false,
    available_for_purchase: row.available_for_purchase ?? true,
    visibilityMagIds: Array.isArray(row.visibility_mag_ids) ? row.visibility_mag_ids : [],
  };
}

interface ProductDetailsFormProps {
  value: ProductFormState;
  onChange: (state: ProductFormState) => void;
  stripeProductId: string | null;
  disabled?: boolean;
}

export function ProductDetailsForm({
  value,
  onChange,
  stripeProductId,
  disabled = false,
}: ProductDetailsFormProps) {
  const [galleries, setGalleries] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    getPublishedGalleries().then(setGalleries).catch(() => setGalleries([]));
  }, []);

  const update = (partial: Partial<ProductFormState>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product details</CardTitle>
        <CardDescription>
          Price, SKU, gallery, and availability. Use &quot;Create Stripe Product from CMS Product&quot; below to sync and get a Stripe Product ID.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeProductId ? (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <Label className="text-muted-foreground">Stripe Product ID</Label>
            <p className="font-mono text-xs mt-1 break-all">{stripeProductId}</p>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-price">Price</Label>
            <Input
              id="product-price"
              type="number"
              min={0}
              step={0.01}
              value={value.price === 0 ? "" : value.price}
              onChange={(e) => update({ price: e.target.value === "" ? 0 : Number(e.target.value) })}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-currency">Currency</Label>
            <Input
              id="product-currency"
              value={value.currency}
              onChange={(e) => update({ currency: e.target.value })}
              disabled={disabled}
              placeholder="USD"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-sku">SKU (optional)</Label>
          <Input
            id="product-sku"
            value={value.sku}
            onChange={(e) => update({ sku: e.target.value })}
            disabled={disabled}
            placeholder="e.g. PROD-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-stock">Stock quantity (optional, leave empty for no tracking)</Label>
          <Input
            id="product-stock"
            type="number"
            min={0}
            value={value.stock_quantity === null ? "" : value.stock_quantity}
            onChange={(e) =>
              update({
                stock_quantity: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
              })
            }
            disabled={disabled}
            placeholder="—"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-gallery">Image gallery (optional)</Label>
          <select
            id="product-gallery"
            value={value.gallery_id}
            onChange={(e) => update({ gallery_id: e.target.value })}
            disabled={disabled}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">None</option>
            {galleries.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={value.taxable}
              onCheckedChange={(c) => update({ taxable: !!c })}
              disabled={disabled}
            />
            <span className="text-sm">Taxable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={value.shippable}
              onCheckedChange={(c) => update({ shippable: !!c })}
              disabled={disabled}
            />
            <span className="text-sm">Shippable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={value.available_for_purchase}
              onCheckedChange={(c) => update({ available_for_purchase: !!c })}
              disabled={disabled}
            />
            <span className="text-sm">Available for purchase</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

export { defaultProductState };
