import { getCurrentSessionUser } from "@/lib/auth/session";
import { ensureMemberInCrm } from "@/lib/automations/on-member-signup";
import { createMemberForContact } from "@/lib/supabase/members";
import { isMembershipEnabledForCurrentTenant } from "@/lib/supabase/tenant-sites";

/**
 * Members area layout. Runs only for routes under /members/*.
 * We run CRM + members sync here (not on every public page) to keep the rest of the site fast.
 * When membership is disabled (tenant_sites.membership_enabled = false), skip sync.
 */
export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();
  const membershipEnabled = await isMembershipEnabledForCurrentTenant();

  if (membershipEnabled && user?.metadata.type === "member") {
    try {
      const result = await ensureMemberInCrm({
        userId: user.id,
        email: user.email,
        displayName: user.display_name ?? undefined,
      });
      if (result.error) {
        console.error("Members layout ensureMemberInCrm:", result.error);
      }
      if (result.contact) {
        const { error: memberErr } = await createMemberForContact(result.contact.id, user.id);
        if (memberErr) {
          console.error("Members layout createMemberForContact:", memberErr);
        }
      }
    } catch (err) {
      console.error("Members layout sync (exception):", err instanceof Error ? err.message : String(err));
    }
  }

  return <>{children}</>;
}
