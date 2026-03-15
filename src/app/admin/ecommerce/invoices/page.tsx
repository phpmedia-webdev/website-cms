import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvoicesListClient } from "./InvoicesListClient";

export default function EcommerceInvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Link href="/admin/ecommerce/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New invoice
          </Button>
        </Link>
      </div>
      <InvoicesListClient />
    </div>
  );
}
