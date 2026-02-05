import Link from "next/link";
import { MemberProfileForm } from "./MemberProfileForm";

/**
 * Member profile — edit display name, avatar, and other member info.
 * Part of the template app: permanent routing under /members for member self-service,
 * independent of membership/MAG features. Middleware ensures only auth + type member (or admin) can reach this.
 */
export default function MembersProfilePage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-muted-foreground mb-8">
        Update your display name and avatar. These are used in the site header and member areas.
      </p>
      <MemberProfileForm />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/members" className="text-primary hover:underline">
          ← Back to Members Area
        </Link>
      </p>
    </main>
  );
}
