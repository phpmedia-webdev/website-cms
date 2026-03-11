"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductListItem } from "@/lib/supabase/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ProductsListClientProps {
  initialProducts: ProductListItem[];
}

export function ProductsListClient({ initialProducts }: ProductsListClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleEdit = (item: ProductListItem) => {
    router.push(`/admin/ecommerce/products/${item.id}/edit`);
  };

  const handleAddProduct = () => {
    router.push("/admin/ecommerce/products/new");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground mt-2">
          Manage sellable products. Edit content and product details. Full product form (price, Stripe sync) in a later step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All products</CardTitle>
              <CardDescription>
                Content type Product only. Add product creates new content; link to product row is created when you save product fields.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p className="mb-4">No products yet.</p>
              <Button onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50 hover:bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium">Title</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Slug</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-right align-middle font-medium">Price</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Stripe</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Available</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Updated</th>
                    <th className="h-10 w-[80px] px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {products.map((item) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">
                        <Link
                          href={`/admin/ecommerce/products/${item.id}/edit`}
                          className="hover:underline"
                        >
                          {item.title || item.slug || "—"}
                        </Link>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground font-mono text-sm">
                        {item.slug || "—"}
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant={item.status === "published" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums">
                        {item.currency} {Number(item.price).toFixed(2)}
                      </td>
                      <td className="p-4 align-middle">
                        {item.stripe_product_id ? (
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            Synced
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {item.available_for_purchase ? (
                          <span className="text-sm">Yes</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground text-sm">
                        {item.updated_at
                          ? format(new Date(item.updated_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="p-4 align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
