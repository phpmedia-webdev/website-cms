import { getMags } from "@/lib/supabase/crm";
import { isMembershipEnabledForCurrentTenant } from "@/lib/supabase/tenant-sites";
import { MembershipsListClient } from "./MembershipsListClient";

export default async function MembershipsPage() {
  const [mags, membershipEnabled] = await Promise.all([
    getMags(true),
    isMembershipEnabledForCurrentTenant(),
  ]);
  return (
    <div className="p-6">
      <MembershipsListClient
        mags={mags}
        membershipEnabled={membershipEnabled}
        magCount={mags.length}
      />
    </div>
  );
}
