import Link from "next/link";
import { MemberSupportForm } from "./MemberSupportForm";

/**
 * Member support — submit a support ticket.
 * Creates or reuses the member's perpetual Support project and a support_ticket task.
 */
export default function MembersSupportPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Support</h1>
      <p className="text-muted-foreground mb-8">
        Submit a support ticket. We’ll get back to you as soon as we can. You can also message us from the Activity section on your dashboard.
      </p>
      <MemberSupportForm />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/members" className="text-primary hover:underline">
          ← Back to Members Area
        </Link>
      </p>
    </main>
  );
}
