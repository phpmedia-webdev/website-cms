import Link from "next/link";
import { MemberActivityStream } from "../MemberActivityStream";

export default function MembersMessagesPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link href="/members" className="hover:text-foreground">
            Members
          </Link>
          <span className="mx-1.5" aria-hidden>
            /
          </span>
          <span className="text-foreground">Messages and notifications</span>
        </div>
        <h1 className="text-3xl font-bold">Messages and notifications</h1>
        <p className="text-sm text-muted-foreground">
          GPUM scaffold page for merged member stream testing.
        </p>
      </div>
      <MemberActivityStream />
    </main>
  );
}

