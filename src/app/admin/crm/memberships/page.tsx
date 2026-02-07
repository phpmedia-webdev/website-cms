import { getMags } from "@/lib/supabase/crm";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { MembershipsListClient } from "./MembershipsListClient";

export default async function MembershipsPage() {
  const [mags, site] = await Promise.all([
    getMags(true),
    getTenantSiteBySchema(getClientSchema()),
  ]);
  const membershipEnabled = site?.membership_enabled ?? true;
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
