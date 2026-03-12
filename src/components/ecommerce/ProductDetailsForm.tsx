"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { getPublishedGalleries } from "@/lib/supabase/galleries";

/** One digital delivery link (label + URL). Stored on product; never sent to customer as-is. */
export interface DigitalDeliveryLink {
  label: string;
  url: string;
}

export interface ProductFormState {
  price: number;
  currency: string;
  sku: string;
  stock_quantity: number | null;
  gallery_id: string;
  taxable: boolean;
  shippable: boolean;
  /** Step 25a: Downloadable (digital delivery). Can be both shippable and downloadable. */
  downloadable: boolean;
  /** Step 25b/25c: Real download URLs per product (Label + URL rows). */
  digitalDeliveryLinks: DigitalDeliveryLink[];
  available_for_purchase: boolean;
  /** MAG ids that can see this product on the shop (when access_level is mag). */
  visibilityMagIds: string[];
  /** Step 17: MAG granted on purchase (membership product). Empty string = none. */
  grantMagId: string;
}

const defaultProductState: ProductFormState = {
  price: 0,
  currency: "USD",
  sku: "",
  stock_quantity: null,
  gallery_id: "",
  taxable: true,
  shippable: false,
  downloadable: false,
  digitalDeliveryLinks: [],
  available_for_purchase: true,
  visibilityMagIds: [],
  grantMagId: "",
};

export function productFormStateFromRow(row: {
  price: number;
  currency: string;
  sku: string | null;
  stock_quantity: number | null;
  gallery_id: string | null;
  taxable: boolean;
  shippable: boolean;
  downloadable?: boolean;
  digital_delivery_links?: { label: string; url: string }[];
  available_for_purchase: boolean;
  visibility_mag_ids?: string[];
  grant_mag_id?: string | null;
}): ProductFormState {
  const rawLinks = row.digital_delivery_links;
  const digitalDeliveryLinks = Array.isArray(rawLinks)
    ? rawLinks.map((x) => ({ label: String(x?.label ?? "").trim(), url: String(x?.url ?? "").trim() })).filter((x) => x.url.length > 0)
    : [];
  return {
    price: Number(row.price),
    currency: row.currency ?? "USD",
    sku: row.sku ?? "",
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    gallery_id: row.gallery_id ?? "",
    taxable: row.taxable ?? true,
    shippable: row.shippable ?? false,
    downloadable: row.downloadable ?? false,
    digitalDeliveryLinks,
    available_for_purchase: row.available_for_purchase ?? true,
    visibilityMagIds: Array.isArray(row.visibility_mag_ids) ? row.visibility_mag_ids : [],
    grantMagId: row.grant_mag_id ?? "",
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
  const [mags, setMags] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getPublishedGalleries().then(setGalleries).catch(() => setGalleries([]));
  }, []);

  useEffect(() => {
    fetch("/api/crm/mags")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string }[]) => setMags(Array.isArray(list) ? list : []))
      .catch(() => setMags([]));
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
        <div className="space-y-2">
          <Label htmlFor="product-grant-mag">Membership granted on purchase (optional)</Label>
          <select
            id="product-grant-mag"
            value={value.grantMagId}
            onChange={(e) => update({ grantMagId: e.target.value })}
            disabled={disabled}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">None — not a membership product</option>
            {mags.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            When a customer pays for this product, they will be granted this membership (MAG).
          </p>
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
              checked={value.downloadable}
              onCheckedChange={(c) => update({ downloadable: !!c })}
              disabled={disabled}
            />
            <span className="text-sm">Downloadable</span>
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

        {value.downloadable && (
          <div className="mt-6 pt-6 border-t space-y-3">
            <Label className="text-sm font-medium">Digital delivery links</Label>
            <p className="text-xs text-muted-foreground">
              Add the real download URLs (e.g. PDF, Part 1, Part 2). Customers get time-limited links; these are never shown as-is.
            </p>
            {value.digitalDeliveryLinks.map((link, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Label (e.g. PDF, Part 1)"
                  className="w-32"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...value.digitalDeliveryLinks];
                    next[idx] = { ...next[idx], label: e.target.value };
                    update({ digitalDeliveryLinks: next });
                  }}
                  disabled={disabled}
                />
                <Input
                  placeholder="https://..."
                  className="flex-1 min-w-[200px]"
                  value={link.url}
                  onChange={(e) => {
                    const next = [...value.digitalDeliveryLinks];
                    next[idx] = { ...next[idx], url: e.target.value };
                    update({ digitalDeliveryLinks: next });
                  }}
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const next = value.digitalDeliveryLinks.filter((_, i) => i !== idx);
                    update({ digitalDeliveryLinks: next });
                  }}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update({ digitalDeliveryLinks: [...value.digitalDeliveryLinks, { label: "", url: "" }] })}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { defaultProductState };
