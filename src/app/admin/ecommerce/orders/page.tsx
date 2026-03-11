import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

/** Placeholder until orders table and flow are implemented (Phase 09). */
export default function EcommerceOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-2">
          Order history and fulfillment. Coming with Ecommerce.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Orders
          </CardTitle>
          <CardDescription>
            Orders will appear here once checkout and payment flow are in place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
