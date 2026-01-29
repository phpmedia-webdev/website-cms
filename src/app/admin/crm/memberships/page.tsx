import { getMags } from "@/lib/supabase/crm";
import { MembershipsListClient } from "./MembershipsListClient";

export default async function MembershipsPage() {
  const mags = await getMags(true);
  return (
    <div className="p-6">
      <MembershipsListClient mags={mags} />
    </div>
  );
}
