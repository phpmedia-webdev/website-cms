import { redirect } from "next/navigation";

/**
 * Support hub — redirect to first sub-page (Quick Support).
 * Full Support UI (chat embed, Knowledge Base) will be developed in a following session.
 */
export default function SupportPage() {
  redirect("/admin/support/quick-support");
}
