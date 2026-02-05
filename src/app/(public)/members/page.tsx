import Link from "next/link";
import { ApplyCodeBlock } from "./ApplyCodeBlock";

/**
 * Member dashboard — landing for logged-in members.
 * Middleware ensures only auth + type member (or admin) can reach this.
 */
export default function MembersDashboardPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Member dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Welcome. Manage your profile and access member-only content.
        </p>
        <ul className="space-y-2">
          <li>
            <Link href="/members/profile" className="text-primary hover:underline">
              My profile
            </Link>
          </li>
          <li>
            <Link href="/members/account" className="text-primary hover:underline">
              Account settings
            </Link>
          </li>
        </ul>
      </div>
      <ApplyCodeBlock />
    </main>
  );
}
