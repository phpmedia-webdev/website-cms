import { listOrganizationsWithMemberCount } from "@/lib/supabase/organizations";
import { getAllTaxonomyTerms, getSectionTaxonomyConfigs } from "@/lib/supabase/taxonomy";
import { getOrganizationTaxonomyTermIds } from "@/lib/supabase/crm-taxonomy";
import { OrganizationsListClient } from "./OrganizationsListClient";

export default async function OrganizationsPage() {
  const [organizations, taxonomyTerms, sectionConfigs] = await Promise.all([
    listOrganizationsWithMemberCount({}),
    getAllTaxonomyTerms(),
    getSectionTaxonomyConfigs(),
  ]);
  const orgIds = organizations.map((o) => o.id);
  const orgTermIds = orgIds.length > 0 ? await getOrganizationTaxonomyTermIds(orgIds) : [];

  return (
    <OrganizationsListClient
      initialOrganizations={organizations}
      taxonomyTerms={taxonomyTerms}
      sectionConfigs={sectionConfigs}
      orgTermIds={orgTermIds}
    />
  );
}
