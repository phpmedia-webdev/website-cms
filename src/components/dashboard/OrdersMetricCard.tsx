import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

/** Standby mock for Phase 09 Ecommerce. Replace with real orders count when orders table exists. */
export function OrdersMetricCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
        <CardTitle className="text-sm font-medium">Orders</CardTitle>
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-xl font-bold">—</div>
        <p className="text-xs text-muted-foreground mt-0.5">Coming with Ecommerce</p>
      </CardContent>
    </Card>
  );
}
