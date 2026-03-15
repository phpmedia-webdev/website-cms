import { listOrganizationsWithMemberCount } from "@/lib/supabase/organizations";
import { OrganizationsListClient } from "./OrganizationsListClient";

export default async function OrganizationsPage() {
  const organizations = await listOrganizationsWithMemberCount({});
  return (
    <OrganizationsListClient
      initialOrganizations={organizations}
    />
  );
}
