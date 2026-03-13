import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ImportOrdersClient } from "./ImportOrdersClient";

/** Step 48: Generic CSV order import with column mapping. */
export default function ImportOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/ecommerce/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Import orders</h1>
          <p className="text-muted-foreground mt-1">
            Upload or paste CSV and map columns to order fields (any source)
          </p>
        </div>
      </div>
      <ImportOrdersClient />
    </div>
  );
}
