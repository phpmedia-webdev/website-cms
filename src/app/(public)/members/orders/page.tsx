import Link from "next/link";
import { MembersOrdersListClient } from "./MembersOrdersListClient";

/**
 * Step 16: Member order history — list orders for the logged-in user with status.
 */
export default function MembersOrdersPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Order history</h1>
        <p className="text-muted-foreground">
          All your payments in one place: one-time orders and subscription payments (first payment and renewals). Status: pending, paid, processing, completed.
        </p>
      </div>
      <MembersOrdersListClient />
      <p className="text-sm text-muted-foreground">
        <Link href="/members" className="text-primary hover:underline">
          ← Back to Members Area
        </Link>
      </p>
    </main>
  );
}
