import Link from "next/link";
import { MembersSubscriptionsClient } from "./MembersSubscriptionsClient";

/**
 * Step 35: Member subscriptions — list active subscriptions, next billing date, link to Stripe Customer Portal.
 */
export default function MembersSubscriptionsPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Subscriptions</h1>
        <p className="text-muted-foreground">
          View your active subscriptions and next billing date. Manage or cancel in Stripe.
        </p>
      </div>
      <MembersSubscriptionsClient />
      <p className="text-sm text-muted-foreground">
        <Link href="/members" className="text-primary hover:underline">
          ← Back to Members Area
        </Link>
      </p>
    </main>
  );
}
