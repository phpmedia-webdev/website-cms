import Link from "next/link";
import { MemberAccountForm } from "./MemberAccountForm";

/**
 * Member account settings — password change, account info.
 * Middleware ensures only auth + type member (or admin) can reach this.
 * Third MVP page for GPUM users (dashboard, profile, account).
 */
export default function MembersAccountPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Account settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account. Change your password below; contact support to change your email.
      </p>
      <MemberAccountForm />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/members" className="text-primary hover:underline">
          ← Back to Members Area
        </Link>
      </p>
    </main>
  );
}
