import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { OrdersListClient } from "./OrdersListClient";
import { StripeSyncOrdersCard } from "./StripeSyncOrdersCard";
import { WooSyncCard } from "./WooSyncCard";

/** Step 16: Orders list. Step 46–48: Sync/import. Step 49: Export for accounting. */
export default function EcommerceOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <a href="/api/ecommerce/export/orders?format=csv" download target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export for accounting (CSV)
          </Button>
        </a>
        <Link href="/admin/ecommerce/orders/import">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import orders (CSV)
          </Button>
        </Link>
      </div>
      <StripeSyncOrdersCard />
      <WooSyncCard />
      <OrdersListClient />
    </div>
  );
}
