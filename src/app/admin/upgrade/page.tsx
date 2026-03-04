import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Single upgrade page for Phase F gating: when the user's role allows a feature
 * but the tenant plan does not (or they lack the feature), redirect here.
 * Same page for both "no role" and "no plan" unless different copy is desired.
 */
export default function AdminUpgradePage() {
  return (
    <div className="max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Feature not available</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Not included in your plan. Request support or contact your plan administrator to get access.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default">
              <Link href="/admin/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/support/quick-support">Quick Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
